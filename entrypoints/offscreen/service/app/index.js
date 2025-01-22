import dayjs from "dayjs";
import minMax from 'dayjs/plugin/minMax'; // ES 2015
import JSZip from "jszip";
import { read, utils, writeXLSX } from "xlsx";
import {
    DATA_TYPE_NAME_COMPANY,
    DATA_TYPE_NAME_COMPANY_TAG,
    DATA_TYPE_NAME_JOB,
    DATA_TYPE_NAME_JOB_TAG,
    TASK_STATUS_ERROR,
    TASK_STATUS_FINISHED,
    TASK_STATUS_FINISHED_BUT_ERROR,
    TASK_STATUS_READY,
    TASK_STATUS_RUNNING,
    TASK_TYPE_COMPANY_DATA_DOWNLOAD,
    TASK_TYPE_COMPANY_DATA_MERGE,
    TASK_TYPE_COMPANY_DATA_UPLOAD,
    TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD,
    TASK_TYPE_COMPANY_TAG_DATA_MERGE,
    TASK_TYPE_COMPANY_TAG_DATA_UPLOAD,
    TASK_TYPE_JOB_DATA_DOWNLOAD,
    TASK_TYPE_JOB_DATA_MERGE,
    TASK_TYPE_JOB_DATA_UPLOAD,
    TASK_TYPE_JOB_TAG_DATA_DOWNLOAD,
    TASK_TYPE_JOB_TAG_DATA_MERGE,
    TASK_TYPE_JOB_TAG_DATA_UPLOAD,
} from "@/common";
import { EXCEPTION, GithubApi } from "@/common/api/github";
import { HISTORY_FILE_MAX_SIZE, TASK_DATA_DOWNLOAD_MAX_DAY, TASK_STATUS_ERROR_MAX_RETRY_COUNT } from "@/common/config";
import { CompanyTagExportBO } from "@/common/data/bo/companyTagExportBO";
import { JobTagExportBO } from "@/common/data/bo/jobTagExportBO";
import { SearchCompanyBO } from "@/common/data/bo/searchCompanyBO";
import { SearchDataSharePartnerBO } from "@/common/data/bo/searchDataSharePartnerBO";
import { SearchJobBO } from "@/common/data/bo/searchJobBO";
import { SearchTaskBO } from "@/common/data/bo/searchTaskBO";
import { SearchTaskDataDownloadBO } from "@/common/data/bo/searchTaskDataDownloadBO";
import { File } from "@/common/data/domain/file";
import { Task } from "@/common/data/domain/task";
import { TaskDataDownload } from "@/common/data/domain/taskDataDownload";
import { TaskDataMerge } from "@/common/data/domain/taskDataMerge";
import { TaskDataUpload } from "@/common/data/domain/taskDataUpload";
import {
    COMPANY_FILE_HEADER,
    COMPANY_TAG_FILE_HEADER,
    companyDataToExcelJSONArray,
    companyExcelDataToObjectArray,
    companyTagDataToExcelJSONArray,
    companyTagExcelDataToObjectArray,
    JOB_FILE_HEADER,
    JOB_TAG_FILE_HEADER,
    jobDataToExcelJSONArray,
    jobExcelDataToObjectArray,
    jobTagDataToExcelJSONArray,
    jobTagExcelDataToObjectArray,
    validImportData
} from "@/common/excel";
import { debugLog, errorLog, infoLog } from "@/common/log";
import { getMergeDataListForCompany, getMergeDataListForJob, getMergeDataListForTag } from "@/common/service/dataSyncService";
import { dateToStr, genIdFromText } from "@/common/utils";
import { bytesToBase64 } from "@/common/utils/base64";
import { getExcelDataFromZipFile } from "@/common/zip";

import { _taskDataUploadGetMaxEndDatetime, _taskDataUploadAddOrUpdate } from "../taskDataUploadService";
import { _addOrUpdateConfig, _getConfigByKey } from "../configService";
import { OauthDTO } from "@/common/data/dto/oauthDTO";
import { Config } from "@/common/data/domain/config";
import { KEY_GITHUB_OAUTH_TOKEN } from "@/common/config";
import { _searchJob, _jobGetByIds, _batchAddOrUpdateJob } from "../jobService";
import { _searchCompany, _companyGetByIds, _batchAddOrUpdateCompany } from "../companyService";
import { _taskAddOrUpdate, _searchTask } from "../taskService";
import { getDb } from "../../database";
import { _companyTagExport, _batchAddOrUpdateCompanyTag } from "../companyTagService";
import { _jobTagExport, _jobTagBatchAddOrUpdate } from "../jobTagService";
import { _searchDataSharePartner } from "../dataSharePartnerService";
import { _searchTaskDataDownload, _taskDataDownloadAddOrUpdate, _taskDataDownloadGetById } from "../taskDataDownloadService";
import { _taskDataUploadGetById } from "../taskDataUploadService";
import { _fileAddOrUpdate, _fileGetById, _fileGetAllMergedNotDeleteFile, _fileLogicDeleteByIds } from "../fileService";
import { _taskDataMergeAddOrUpdate, _taskDataMergeGetById } from "../taskDataMergeService";
import { UserDTO } from "@/common/data/dto/userDTO";
import { KEY_GITHUB_USER } from "@/common/config";
dayjs.extend(minMax);

function calculateMaxYear(list) {
    let validValueArray = list.filter(item => { return item.name.match("^2[0-9]{3}$") });
    let maxValue = null;
    if (validValueArray.length > 0) {
        if (validValueArray.length > 1) {
            validValueArray.sort((a1, a2) => { return Number.parseInt(a2.name) - Number.parseInt(a1.name) });
        }
        maxValue = Number.parseInt(validValueArray[0].name);
    }
    return maxValue;
}

function calculateMaxMonthAndDay(list) {
    let validValueArray = list.filter(item => { return item.name.match("^[01][0-9]-[0123][0-9]$") });
    let maxValue = null;
    if (validValueArray.length > 0) {
        if (validValueArray.length > 1) {
            validValueArray.sort((a1, a2) => { return Number.parseInt(a2.name.replace("-", "")) - Number.parseInt(a1.name.replace("-", "")) });
        }
        maxValue = validValueArray[0].name;
    }
    return maxValue;
}

export async function calculateRepoMaxUploadDate({ userName, repoName }) {
    let result = null;
    try {
        let yearList = await GithubApi.listRepoContents(userName, repoName, "/", { getTokenFunction: getToken, setTokenFunction: setToken, });
        let maxYear = calculateMaxYear(yearList);
        if (maxYear) {
            let monthAndDayList = await GithubApi.listRepoContents(userName, repoName, `/${maxYear}`, { getTokenFunction: getToken, setTokenFunction: setToken, });
            let maxMonthAndDay = calculateMaxMonthAndDay(monthAndDayList);
            if (maxMonthAndDay) {
                //skip
            } else {
                maxMonthAndDay = "01-01"
            }
            let yearMonthDay = `${maxYear}-${maxMonthAndDay}`
            result = dayjs(yearMonthDay).startOf("day").toDate();
        }
    } catch (e) {
        if (e == EXCEPTION.NOT_FOUND) {
            //skip
        } else {
            throw e;
        }
    }
    return result;
}

export async function calculateDataSharePartnerList() {
    let searchParam = new SearchDataSharePartnerBO();
    searchParam.orderByColumn = "updateDatetime";
    searchParam.orderBy = "DESC";
    return (await _searchDataSharePartner({ param: searchParam })).items;
}

export async function calculateUploadTask({ userName, repoName } = {}) {
    //根据今天的时间判断最新的job,company,companyTag任务是否已经存在
    let taskDataUploadMaxDateString = await _taskDataUploadGetMaxEndDatetime();
    let taskDataUploadMaxDate = taskDataUploadMaxDateString ? dayjs(taskDataUploadMaxDateString) : null;
    let today = dayjs(new Date()).startOf("day");
    if (today.isSame(taskDataUploadMaxDate)) {
        //如果存在
        debugLog(`[TASK DATA UPLOAD CALCULATE] taskDataUploadMaxDate is today = ${taskDataUploadMaxDate}`)
        debugLog(`[TASK DATA UPLOAD CALCULATE] skip add data upload record`)
        //skip
    } else {
        debugLog(`[TASK DATA UPLOAD CALCULATE] taskDataUploadMaxDate(${taskDataUploadMaxDate}) not equal today(${today})`)
        debugLog(`[TASK DATA UPLOAD CALCULATE] add data upload record starting`)
        //如果不存在
        //获取仓库中最新数据上传的时间
        try {
            let repoMaxDate = await calculateRepoMaxUploadDate({
                userName, repoName
            })
            //计算数据项开始时间,取最小值(数据库时间,仓库时间)
            let dataSyncStartDatetime = dayjs.min(taskDataUploadMaxDate, dayjs(repoMaxDate));
            debugLog(`[TASK DATA UPLOAD CALCULATE] dataSyncStartDatetime = ${dataSyncStartDatetime}`)
            try {
                await (await getDb()).transaction(async (tx) => {
                    await addDataUploadTask({
                        type: TASK_TYPE_JOB_DATA_UPLOAD, startDatetime: dataSyncStartDatetime, endDatetime: today, userName, repoName, connection: tx,
                        total: (await getJobData({ startDatetime: dataSyncStartDatetime, endDatetime: today, connection: tx })).total,
                    });
                    await addDataUploadTask({
                        type: TASK_TYPE_COMPANY_DATA_UPLOAD, startDatetime: dataSyncStartDatetime, endDatetime: today, userName, repoName, connection: tx,
                        total: (await getCompanyData({ startDatetime: dataSyncStartDatetime, endDatetime: today, connection: tx })).total
                    });
                    await addDataUploadTask({
                        type: TASK_TYPE_COMPANY_TAG_DATA_UPLOAD, startDatetime: dataSyncStartDatetime, endDatetime: today, userName, repoName, connection: tx,
                        total: (await getCompanyTagData({ startDatetime: dataSyncStartDatetime, endDatetime: today, connection: tx })).total
                    });
                    await addDataUploadTask({
                        type: TASK_TYPE_JOB_TAG_DATA_UPLOAD, startDatetime: dataSyncStartDatetime, endDatetime: today, userName, repoName, connection: tx,
                        total: (await getJobTagData({ startDatetime: dataSyncStartDatetime, endDatetime: today, connection: tx })).total
                    });
                });
            } catch (e) {
                errorLog(e);
            }
        } catch (e) {
            errorLog(e);
        }
        debugLog(`[TASK DATA UPLOAD CALCULATE] add data upload record end`)
    }
}

export async function calculateDownloadTask({ userName, repoName }) {
    let now = dayjs();
    let endDatetime = dayjs(now);
    let startDatetime = dayjs(now).subtract(TASK_DATA_DOWNLOAD_MAX_DAY, "day");
    let yearMap = new Map();
    yearMap.set(endDatetime.year(), null);
    yearMap.set(startDatetime.year(), null);
    let yearList = Array.from(yearMap.keys());
    let allDay = [];
    for (let i = 0; i < yearList.length; i++) {
        let year = yearList[i];
        try {
            let dayList = await GithubApi.listRepoContents(userName, repoName, `/${year}`, { getTokenFunction: getToken, setTokenFunction: setToken, });
            for (let n = 0; n < dayList.length; n++) {
                let dayItem = dayList[n];
                allDay.push(dayjs(`${year}-${dayItem.name}`).toDate());
            }
        } catch (e) {
            if (e == EXCEPTION.NOT_FOUND) {
                //skip
            } else {
                throw e;
            }
        }
    }
    allDay = allDay.sort((a1, a2) => { return a1.getTime() - a2.getTime() });
    let nowDate = now.toDate();
    allDay = allDay.filter(item => { return nowDate.getTime() - item.getTime() < 1000 * 60 * 60 * 24 * TASK_DATA_DOWNLOAD_MAX_DAY })
    //查找缺失的日期
    //获得数据库区间时间范围的记录
    let endDatetimeForSearchTaskDownload = null;
    let startDatetimeForSearchTaskDownload = null;
    if (allDay.length > 0) {
        endDatetimeForSearchTaskDownload = allDay[allDay.length - 1];
        startDatetimeForSearchTaskDownload = allDay[0];
        let searchParam = new SearchTaskDataDownloadBO();
        searchParam.userName = userName;
        searchParam.repoName = repoName;
        searchParam.startDatetime = dateToStr(startDatetimeForSearchTaskDownload);
        searchParam.endDatetime = dateToStr(dayjs(endDatetimeForSearchTaskDownload).add(1, "day"));
        searchParam.orderByColumn = "createDatetime";
        searchParam.orderBy = "ASC";
        let taskDataDownloadResult = await _searchTaskDataDownload({ param: searchParam });
        let taskDataDownloadMap = new Map();
        let taskDataDownloadResultItems = taskDataDownloadResult.items;
        if (taskDataDownloadResultItems.length > 0) {
            for (let i = 0; i < taskDataDownloadResultItems.length; i++) {
                let item = taskDataDownloadResultItems[i];
                taskDataDownloadMap.set(dateToStr(item.datetime), null);
            }
        } else {
            //skip
        }
        let filterDay = allDay.filter(item => { return !taskDataDownloadMap.has(dateToStr(item)) });
        debugLog(`[TASK DATA DOWNLOAD CALCULATE] filterDay length = ${filterDay.length} to add record,${filterDay.toString()}`)
        //将缺失的日期任务添加到数据
        if (filterDay.length > 0) {
            try {
                await (await getDb()).transaction(async (tx) => {
                    for (let i = 0; i < filterDay.length; i++) {
                        let day = filterDay[i];
                        await addDataDownloadTask({ type: TASK_TYPE_JOB_DATA_DOWNLOAD, datetime: day, userName, repoName, connection: tx })
                        await addDataDownloadTask({ type: TASK_TYPE_COMPANY_DATA_DOWNLOAD, datetime: day, userName, repoName, connection: tx })
                        await addDataDownloadTask({ type: TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD, datetime: day, userName, repoName, connection: tx })
                        await addDataDownloadTask({ type: TASK_TYPE_JOB_TAG_DATA_DOWNLOAD, datetime: day, userName, repoName, connection: tx })
                    }
                });
            } catch (e) {
                errorLog(e);
            }
        } else {
            debugLog(`[TASK DATA DOWNLOAD CALCULATE] no newer record for ${userName}/${repoName}`);
        }
    } else {
        debugLog(`[TASK DATA DOWNLOAD CALCULATE] repo(${userName}/${repoName}) has't match record `);
    }
}

const TASK_HANDLE_MAP = new Map();


// Upload
TASK_HANDLE_MAP.set(TASK_TYPE_JOB_DATA_UPLOAD, async (dataId) => {
    return uploadDataByDataId(dataId, DATA_TYPE_NAME_JOB, getJobData, jobDataToExcelJSONArray);
})
TASK_HANDLE_MAP.set(TASK_TYPE_COMPANY_DATA_UPLOAD, async (dataId) => {
    return uploadDataByDataId(dataId, DATA_TYPE_NAME_COMPANY, getCompanyData, companyDataToExcelJSONArray);
})
TASK_HANDLE_MAP.set(TASK_TYPE_COMPANY_TAG_DATA_UPLOAD, async (dataId) => {
    return uploadDataByDataId(dataId, DATA_TYPE_NAME_COMPANY_TAG, getCompanyTagData, companyTagDataToExcelJSONArray);
})
TASK_HANDLE_MAP.set(TASK_TYPE_JOB_TAG_DATA_UPLOAD, async (dataId) => {
    return uploadDataByDataId(dataId, DATA_TYPE_NAME_JOB_TAG, getJobTagData, jobTagDataToExcelJSONArray);
})

// Download
TASK_HANDLE_MAP.set(TASK_TYPE_JOB_DATA_DOWNLOAD, async (dataId) => {
    return downloadDataByDataId(dataId, DATA_TYPE_NAME_JOB, TASK_TYPE_JOB_DATA_MERGE);
})
TASK_HANDLE_MAP.set(TASK_TYPE_COMPANY_DATA_DOWNLOAD, async (dataId) => {
    return downloadDataByDataId(dataId, DATA_TYPE_NAME_COMPANY, TASK_TYPE_COMPANY_DATA_MERGE);
})
TASK_HANDLE_MAP.set(TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD, async (dataId) => {
    return downloadDataByDataId(dataId, DATA_TYPE_NAME_COMPANY_TAG, TASK_TYPE_COMPANY_TAG_DATA_MERGE);
})
TASK_HANDLE_MAP.set(TASK_TYPE_JOB_TAG_DATA_DOWNLOAD, async (dataId) => {
    return downloadDataByDataId(dataId, DATA_TYPE_NAME_JOB_TAG, TASK_TYPE_JOB_TAG_DATA_MERGE);
})

// Merge
TASK_HANDLE_MAP.set(TASK_TYPE_JOB_DATA_MERGE, async (dataId) => {
    return mergeDataByDataId(dataId, TASK_TYPE_JOB_DATA_MERGE, DATA_TYPE_NAME_JOB, JOB_FILE_HEADER, jobExcelDataToObjectArray, async (items, taskDataMerge, connection) => {
        //处理数据冲突问题，根据创建时间来判断
        //处理公司名全称问题
        let targetList = await getMergeDataListForJob(items, "jobId", async (ids) => {
            return await _jobGetByIds({ param: ids, connection });
        });
        await _batchAddOrUpdateJob({ param: targetList, connection });
        return targetList.length;
    });
})
TASK_HANDLE_MAP.set(TASK_TYPE_COMPANY_DATA_MERGE, async (dataId) => {
    return mergeDataByDataId(dataId, TASK_TYPE_COMPANY_DATA_MERGE, DATA_TYPE_NAME_COMPANY, COMPANY_FILE_HEADER, companyExcelDataToObjectArray, async (items, taskDataMerge, connection) => {
        //处理数据冲突问题，根据数据来源更新时间来判断
        let targetList = await getMergeDataListForCompany(items, "companyId", async (ids) => {
            return _companyGetByIds({ param: ids, connection });
        });
        await _batchAddOrUpdateCompany({ param: targetList, connection });
        return targetList.length;
    });
})
TASK_HANDLE_MAP.set(TASK_TYPE_COMPANY_TAG_DATA_MERGE, async (dataId) => {
    return mergeDataByDataId(dataId, TASK_TYPE_COMPANY_TAG_DATA_MERGE, DATA_TYPE_NAME_COMPANY_TAG, COMPANY_TAG_FILE_HEADER, companyTagExcelDataToObjectArray, async (items, taskDataMerge, connection) => {
        let userDTO = await _getUser({ connection });
        if (userDTO) {
            let username = userDTO.login;
            //处理数据冲突问题，根据更新时间合并
            let targetList = await getMergeDataListForTag(items, "companyName", async (companyNames) => {
                let searchParam = new CompanyTagExportBO();
                //如果数据是当前登录用户，则将source设置为空，作为本地用户
                searchParam.source = taskDataMerge.username == username ? "" : taskDataMerge.username;
                searchParam.companyIds = companyNames.map(item => genIdFromText(item));
                return await _companyTagExport({ param: searchParam, connection });
            })
            if (targetList.length > 0) {
                //如果补充source信息
                targetList.forEach(item => {
                    item.source = taskDataMerge.username == username ? null : taskDataMerge.username;
                });
            }
            await _batchAddOrUpdateCompanyTag({ companyTagBOs: targetList, overrideUpdateDatetime: true, connection });
            return targetList.length;
        } else {
            throw `[Task Data Merge] login user not found`;
        }
    });
})
TASK_HANDLE_MAP.set(TASK_TYPE_JOB_TAG_DATA_MERGE, async (dataId) => {
    return mergeDataByDataId(dataId, TASK_TYPE_JOB_TAG_DATA_MERGE, DATA_TYPE_NAME_JOB_TAG, JOB_TAG_FILE_HEADER, jobTagExcelDataToObjectArray, async (items, taskDataMerge, connection) => {
        let userDTO = await _getUser({ connection });
        if (userDTO) {
            let username = userDTO.login;
            //处理数据冲突问题，根据更新时间合并
            let targetList = await getMergeDataListForTag(items, "jobId", async (ids) => {
                let searchParam = new JobTagExportBO();
                //如果数据是当前登录用户，则将source设置为空，作为本地用户
                searchParam.source = taskDataMerge.username == username ? "" : taskDataMerge.username;
                searchParam.jobIds = ids;
                return await _jobTagExport({ param: searchParam, connection });
            })
            if (targetList.length > 0) {
                //如果补充source信息
                targetList.forEach(item => {
                    item.source = taskDataMerge.username == username ? null : taskDataMerge.username;
                });
            }
            await _jobTagBatchAddOrUpdate(targetList, true, { connection });
            return targetList.length;
        } else {
            throw `[Task Data Merge] login user not found`;
        }
    });
})

async function isLogin() {
    return (await getToken()) ? true : false;
}

export async function runScheduleTask() {
    infoLog("[TASK] [SCHEDULE] runScheduleTask")
    await scheduleClearFile();
}

async function scheduleClearFile() {
    infoLog("[TASK] [SCHEDULE] scheduleClearFile")
    await (await getDb()).transaction(async (tx) => {
        const mergedFileList = await _fileGetAllMergedNotDeleteFile({ connection: tx });
        let totalSize = 0;
        let readyToDeleteFileIdList = [];
        for (let i = 0; i < mergedFileList.length; i++) {
            const item = mergedFileList[i];
            totalSize += item.size;
            if (HISTORY_FILE_MAX_SIZE >= 0 && totalSize > HISTORY_FILE_MAX_SIZE) {
                readyToDeleteFileIdList.push(item.id);
            }
        }
        const readyToDeleteFileIdListCount = readyToDeleteFileIdList.length;
        infoLog(`[TASK] [SCHEDULE] history file max size = ${HISTORY_FILE_MAX_SIZE},file count readyDelete/merged  = ${readyToDeleteFileIdListCount}/${mergedFileList.length}`)
        if (readyToDeleteFileIdListCount > 0) {
            await _fileLogicDeleteByIds({ param: readyToDeleteFileIdList, connection: tx });
            infoLog(`[TASK] [SCHEDULE] delete history file count = ${readyToDeleteFileIdList.length}`);
        } else {
            infoLog(`[TASK] [SCHEDULE] no history file to delete`);
        }
    });
}

export async function runTask() {
    debugLog(`[TASK RUN] starting`)
    //获取按创建时间升序需要执行的任务
    let searchParam = new SearchTaskBO();
    searchParam.statusList = [TASK_STATUS_READY, TASK_STATUS_RUNNING, TASK_STATUS_ERROR];
    searchParam.endRetryCount = TASK_STATUS_ERROR_MAX_RETRY_COUNT;
    searchParam.orderByColumn = "createDatetime";
    searchParam.orderBy = "ASC";
    let taskResult = await _searchTask({ param: searchParam });
    debugLog(`[TASK RUN] task count = ${taskResult.total}`)
    if (taskResult.total > 0) {
        for (let i = 0; i < taskResult.items.length; i++) {
            let taskItem = taskResult.items[i];
            debugLog(`[TASK RUN] current task seq = ${i}, id = ${taskItem.id},type = ${taskItem.type},retryCount = ${taskItem.retryCount}`)
            taskItem.retryCount = taskItem.retryCount + 1;
            let startDatetime = dayjs();
            try {
                taskItem.status = TASK_STATUS_RUNNING;
                await _taskAddOrUpdate({ param: taskItem });
                if (TASK_HANDLE_MAP.has(taskItem.type)) {
                    //执行
                    let errorMessage = await TASK_HANDLE_MAP.get(taskItem.type)(taskItem.dataId);
                    if (errorMessage) {
                        taskItem.errorReason = errorMessage;
                        taskItem.status = TASK_STATUS_FINISHED_BUT_ERROR;
                    } else {
                        taskItem.status = TASK_STATUS_FINISHED;
                    }
                    taskItem.costTime = dayjs().diff(startDatetime);
                    await _taskAddOrUpdate({ param: taskItem });
                } else {
                    throw `[TASK RUN] not supported task type = ${taskItem.type}`
                }
            } catch (e) {
                debugLog(e);
                //执行异常，补充异常信息
                taskItem.status = TASK_STATUS_ERROR;
                taskItem.errorReason = JSON.stringify(e);
                taskItem.costTime = dayjs().diff(startDatetime);
                await _taskAddOrUpdate({ param: taskItem });
            }
        }
    } else {
        debugLog(`[TASK RUN] skip task run`)
    }
    debugLog(`[TASK RUN] end`)
}

async function addDataDownloadTask({ type, datetime, userName, repoName, connection = null } = {}) {
    let taskDataDownload = new TaskDataDownload();
    taskDataDownload.type = type;
    taskDataDownload.username = userName;;
    taskDataDownload.reponame = repoName;
    taskDataDownload.datetime = datetime;
    let savedTaskDataDownload = await _taskDataDownloadAddOrUpdate({ param: taskDataDownload, connection });
    let task = new Task();
    task.type = type;
    task.dataId = savedTaskDataDownload.id;
    task.retryCount = 0;
    task.costTime = 0;
    task.status = TASK_STATUS_READY;
    await _taskAddOrUpdate({ param: task, connection });
}

async function addDataUploadTask({ type, startDatetime, endDatetime, userName, repoName, total, connection = null } = {}) {
    let taskDataUpload = new TaskDataUpload();
    taskDataUpload.type = type;
    taskDataUpload.username = userName;;
    taskDataUpload.reponame = repoName;
    taskDataUpload.startDatetime = startDatetime;
    taskDataUpload.endDatetime = endDatetime;
    taskDataUpload.dataCount = total;
    let savedTaskDataUpload = await _taskDataUploadAddOrUpdate({ param: taskDataUpload, connection });
    let task = new Task();
    task.type = type;
    task.dataId = savedTaskDataUpload.id;
    task.retryCount = 0;
    task.costTime = 0;
    task.status = TASK_STATUS_READY;
    await _taskAddOrUpdate({ param: task, connection });
}

async function convertJsonObjectToExcelData(result) {
    const ws = utils.json_to_sheet(result);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Data");
    return writeXLSX(wb, { type: "buffer" });
}

async function getJobData({ startDatetime, endDatetime, connection = null } = {}) {
    let searchParam = new SearchJobBO();
    searchParam.startDatetimeForUpdate = startDatetime;
    searchParam.endDatetimeForUpdate = endDatetime;
    searchParam.orderByColumn = "updateDatetime";
    searchParam.orderBy = "DESC";
    return _searchJob({
        param: searchParam,
        connection
    });
}

async function getCompanyData({ startDatetime, endDatetime, connection = null } = {}) {
    let searchParam = new SearchCompanyBO();
    searchParam.startDatetimeForUpdate = startDatetime;
    searchParam.endDatetimeForUpdate = endDatetime;
    searchParam.orderByColumn = "updateDatetime";
    searchParam.orderBy = "DESC";
    return _searchCompany({
        param: searchParam,
        connection
    });
}

async function getCompanyTagData({ startDatetime, endDatetime, connection = null } = {}) {
    let searchParam = new CompanyTagExportBO();
    searchParam.source = "";
    searchParam.startDatetimeForUpdate = startDatetime;
    searchParam.endDatetimeForUpdate = endDatetime;
    const items = await _companyTagExport({
        param: searchParam,
        connection
    });
    return {
        total: items.length,
        items
    };
}

async function getJobTagData({ startDatetime, endDatetime, connection = null } = {}) {
    let searchParam = new JobTagExportBO();
    searchParam.source = "";
    searchParam.startDatetimeForUpdate = startDatetime;
    searchParam.endDatetimeForUpdate = endDatetime;
    const items = await _jobTagExport({
        param: searchParam,
        connection
    })
    return {
        total: items.length,
        items
    };
}

async function uploadData({ userName, repoName, dirPath, dataTypeName, dataList, jsonObjectToExcelJsonArrayFunction } = {}) {
    if (dataList.length > 0) {
        infoLog(`[Task Data Upload ${dataTypeName}] data length = ${dataList.length}`);
        let result = jsonObjectToExcelJsonArrayFunction(dataList);
        let excelData = await convertJsonObjectToExcelData(result);
        let zipData = await zipFileToBase64(dataTypeName, excelData);
        let filePath = `${dirPath}/${dataTypeName}.zip`;
        try {
            await GithubApi.createFileContent(userName, repoName, filePath, zipData, `upload ${dataTypeName} file,local datetime=${dayjs().format()}`, { getTokenFunction: getToken, setTokenFunction: setToken, });
            infoLog(`[Task Data Upload ${dataTypeName}] create file ${filePath} success`);
        } catch (e) {
            if (e == EXCEPTION.CREATION_FAILED) {
                infoLog(`[Task Data Upload ${dataTypeName}] create file ${filePath} failure`);
                return `upload file ${filePath} failure`;
            } else {
                throw e;
            }
        }
    } else {
        infoLog(`[Task Data Upload ${dataTypeName}] no data`);
    }
}

async function zipFileToBase64(dataTypeName, excelData) {
    let promise = new Promise((resolve, reject) => {
        const zip = new JSZip();
        zip.file(`${dataTypeName}.xlsx`, excelData);
        zip
            .generateAsync({
                compression: "DEFLATE",
                compressionOptions: { level: 9 },
                type: "base64",
            })
            .then(function (content) {
                resolve(content);
            }).catch((e) => {
                reject(e);
            });
    });
    return promise;
}

export async function createRepoIfNotExists({ userName, repoName }) {
    try {
        await GithubApi.getRepo(userName, repoName, { getTokenFunction: getToken, setTokenFunction: setToken, });
        infoLog(`[Task Data] repo ${repoName} exists`);
    } catch (e) {
        infoLog(`[Task Data] repo ${repoName} exists not exists`);
        infoLog(`[Task Data] create a new repo ${repoName}`);
        if (e == EXCEPTION.NOT_FOUND) {
            await GithubApi.newRepo(repoName, { getTokenFunction: getToken, setTokenFunction: setToken, });
            infoLog(`create a new repo ${repoName} success`);
        } else {
            throw e;
        }
    }
}

async function mergeDataByDataId(dataId, taskType, dataTypeName, fileHeader, excelDataToObjectArrayFunction, dataInsertFunction) {
    debugLog(`[TASK DATA MERGE] Task dataId = ${dataId},taskType = ${taskType}`);
    const taskDataMerge = await _taskDataMergeGetById({ param: dataId });
    debugLog(`[TASK DATA MERGE] taskDataMerge dataId = ${taskDataMerge.dataId},username = ${taskDataMerge.username},repoName = ${taskDataMerge.reponame},datetime = ${taskDataMerge.datetime}`);
    const file = await _fileGetById({ param: taskDataMerge.dataId });
    debugLog(`[TASK DATA MERGE] file id = ${file.id},name = ${file.name}`);
    let base64Content = file.content;
    let excelFileBufferData = await getExcelDataFromZipFile(base64Content, dataTypeName);
    let wb = read(excelFileBufferData, { type: "buffer" });
    let validResultObject = validImportData(utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }), fileHeader);
    if (!validResultObject.validResult) {
        debugLog(`[TASK DATA MERGE] valid file name = ${file.name}, id = ${file.id} failure`);
        return `文件校验失败，缺少数据列(${validResultObject.lackColumn.length}):${validResultObject.lackColumn.join(",")}`;
    }
    debugLog(`[TASK DATA MERGE] valid file name = ${file.name}, id = ${file.id} success`);
    const data = utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 2 });
    await (await getDb()).transaction(async (tx) => {
        let count = await dataInsertFunction(excelDataToObjectArrayFunction(data, taskDataMerge.datetime), taskDataMerge, tx);
        taskDataMerge.dataCount = count;
        await _taskDataMergeAddOrUpdate({ param: taskDataMerge, connection: tx });
        debugLog(`[TASK DATA MERGE] merge file name = ${file.name}, id = ${file.id} success,data count = ${count}`);
    });
}

async function downloadDataByDataId(dataId, dataTypeName, taskType) {
    if (!(await isLogin())) {
        infoLog(`[TASK HANDLE]No login info, skip run task dataId = ${dataId}, dataTypeName = ${dataTypeName}`)
        throw EXCEPTION.NO_LOGIN;
    }
    let taskData = await _taskDataDownloadGetById({ param: dataId });
    let userName = taskData.username;
    let repoName = taskData.reponame;
    let datetime = taskData.datetime;
    const path = getPathByDatetime({ datetime }) + `/${dataTypeName}.zip`;
    let content = null;
    try {
        content = await GithubApi.listRepoContents(userName, repoName, path, { getTokenFunction: getToken, setTokenFunction: setToken, });
        if (content.type == "file") {
            try {
                const file = new File();
                file.name = content.name;
                file.sha = content.sha;
                file.encoding = content.encoding;
                if (file.encoding == "none") {
                    //https://docs.github.com/zh/rest/repos/contents#get-repository-content
                    //Between 1-100 MB: Only the raw or object custom media types are supported. Both will work as normal, except that when using the object media type, the content field will be an empty string and the encoding field will be "none". To get the contents of these larger files, use the raw media type.
                    const rawData = await GithubApi.getRepoRawFile(userName, repoName, path, { getTokenFunction: getToken, setTokenFunction: setToken, });
                    file.encoding = "base64"
                    file.content = bytesToBase64(new Uint8Array(rawData, 0, rawData.byteLength));
                } else {
                    file.content = content.content;
                }
                file.size = content.size;
                file.type = content.type;
                await (await getDb()).transaction(async (tx) => {
                    const savedFile = await _fileAddOrUpdate({ param: file, connection: tx });
                    infoLog(`[TASK DOWNLOAD DATA] save file to database from ${userName}.${repoName}.${path}, id = ${savedFile.id}`);
                    //添加数据合并任务
                    const taskDataMerge = new TaskDataMerge();
                    taskDataMerge.type = taskType;
                    taskDataMerge.username = userName;
                    taskDataMerge.reponame = repoName;
                    taskDataMerge.datetime = datetime;
                    taskDataMerge.dataId = savedFile.id;
                    const savedTaskDataMerge = await _taskDataMergeAddOrUpdate({ param: taskDataMerge, connection: tx });
                    infoLog(`[TASK DOWNLOAD DATA] merge task to database from ${userName}.${repoName}.${path}, id = ${savedTaskDataMerge.id}, dataId = ${dataId}`);
                    let task = new Task();
                    task.type = taskType;
                    task.dataId = savedTaskDataMerge.id;
                    task.retryCount = 0;
                    task.costTime = 0;
                    task.status = TASK_STATUS_READY;
                    const savedTask = await _taskAddOrUpdate({ param: task, connection: tx })
                    infoLog(`[TASK DOWNLOAD DATA] add task to database from task type = ${taskType}, dataId = ${task.dataId}, id = ${savedTask.id}`);
                });
            } catch (e) {
                throw e;
            }
        } else {
            throw `unknown content type = ${content.type}`;
        }
    } catch (e) {
        if (e == EXCEPTION.NOT_FOUND) {
            debugLog(`[TASK DOWNLOAD DATA]file not exists ${userName}.${repoName}.${path}`)
            //文件不存在
            //判断文件日期距离今日零点是否已超过一天
            //如果超过，则将通过任务
            //如果未超过则报错，使得其可以继续查询
            let now = new Date()
            if (dayjs(datetime).isBefore(dayjs(now).startOf("day").subtract(1, "day"))) {
                //skip
                debugLog(`[TASK DOWNLOAD DATA] file ${userName}.${repoName}.${path} datetime = ${datetime} before now = ${dateToStr(now)} more than 1 day`)
                debugLog(`[TASK DOWNLOAD DATA] file ${userName}.${repoName}.${path} never upload`)
                return `file ${userName}.${repoName}.${path} never upload`;
            } else {
                debugLog(`[TASK DOWNLOAD DATA] file ${userName}.${repoName}.${path} continue download in next time`)
                throw `File not found,file ${userName}.${repoName}.${path} continue download in next time`;
            }
        } else {
            throw e;
        }
    }
}

async function uploadDataByDataId(dataId, dataTypeName, getDataFunction, jsonObjectToExcelJsonArrayFunction) {
    if (!(await isLogin())) {
        debugLog(`[TASK HANDLE]No login info, skip run task dataId = ${dataId}, dataTypeName = ${dataTypeName}`)
        throw EXCEPTION.NO_LOGIN;
    }
    let taskDataUpload = await _taskDataUploadGetById({ param: dataId });
    let userName = taskDataUpload.username;
    let repoName = taskDataUpload.reponame;
    let startDatetime = taskDataUpload.startDatetime;
    let endDatetime = taskDataUpload.endDatetime;
    let dirPath = getPathByDatetime({ endDatetime });
    await createRepoIfNotExists({ userName, repoName });
    return await uploadData({
        userName, repoName, dirPath,
        dataTypeName,
        dataList: (await getDataFunction({ startDatetime, endDatetime })).items,
        jsonObjectToExcelJsonArrayFunction,
    });
}

function getPathByDatetime({ datetime }) {
    return `/${dayjs(datetime).format("YYYY")}/${dayjs(datetime).format("MM-DD")}`;
}

/**
 * 
 * @param {OauthDTO} token 
 */
export async function setToken(token) {
    let config = new Config();
    config.key = KEY_GITHUB_OAUTH_TOKEN;
    config.value = JSON.stringify(token);
    return _addOrUpdateConfig(config);
}

/**
 * 
 * @returns OauthDTO
 */
export async function getToken() {
    let oauthDTO = new OauthDTO();
    let config = await _getConfigByKey(KEY_GITHUB_OAUTH_TOKEN);
    if (config) {
        let value = JSON.parse(config.value);
        if (value) {
            Object.assign(oauthDTO, value);
            return oauthDTO;
        }
    }
    return null;
}

/**
 * 
 * @returns UserDTO
 */
export async function _getUser({ connection = null } = {}) {
    let userDTO = new UserDTO();
    let config = await _getConfigByKey(KEY_GITHUB_USER, { connection });
    if (config) {
        let value = JSON.parse(config.value);
        if (value) {
            Object.assign(userDTO, value);
            return userDTO;
        }
    }
    return null;
}