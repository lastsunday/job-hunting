import { debugLog, errorLog, infoLog, isDebug } from "../../common/log"
import { SearchJobBO } from "../../common/data/bo/searchJobBO";
import { SearchCompanyBO } from "../../common/data/bo/searchCompanyBO";
import { SearchCompanyTagBO } from "../../common/data/bo/searchCompanyTagBO";
import { JobApi, CompanyApi, TaskDataUploadApi, DBApi, TaskApi, TaskDataDownloadApi, FileApi, TaskDataMergeApi, DataSharePartnerApi } from "../../common/api";
import { BACKGROUND } from "../../common/api/bridgeCommon";
import {
    MAX_RECORD_COUNT, TASK_STATUS_READY, TASK_TYPE_JOB_DATA_UPLOAD,
    TASK_TYPE_COMPANY_DATA_UPLOAD, TASK_TYPE_COMPANY_TAG_DATA_UPLOAD,
    TASK_STATUS_ERROR, TASK_STATUS_RUNNING, TASK_STATUS_FINISHED,
    TASK_TYPE_JOB_DATA_DOWNLOAD, TASK_TYPE_COMPANY_DATA_DOWNLOAD, TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD,
    TASK_TYPE_JOB_DATA_MERGE,
    TASK_TYPE_COMPANY_DATA_MERGE,
    TASK_TYPE_COMPANY_TAG_DATA_MERGE,
    TASK_STATUS_FINISHED_BUT_ERROR
} from "../../common";
import { utils, writeXLSX, read } from "xlsx";
import {
    jobDataToExcelJSONArray, companyDataToExcelJSONArray, companyTagDataToExcelJSONArray,
    validImportData, JOB_FILE_HEADER, jobExcelDataToObjectArray,
    COMPANY_FILE_HEADER, companyExcelDataToObjectArray,
    COMPANY_TAG_FILE_HEADER, companyTagExcelDataToObjectArray
} from "../../common/excel";
import { EXCEPTION, GithubApi } from "../../common/api/github";
import { getToken, setToken } from "./authService";
import dayjs from "dayjs";
import minMax from 'dayjs/plugin/minMax' // ES 2015
import { Task } from "../../common/data/domain/task";
import { TaskDataUpload } from "../../common/data/domain/taskDataUpload";
import { TaskDataDownload } from "../../common/data/domain/taskDataDownload";
import { SearchTaskBO } from "../../common/data/bo/searchTaskBO";
import { SearchTaskDataDownloadBO } from "../../common/data/bo/searchTaskDataDownloadBO";
import { TASK_DATA_DOWNLOAD_MAX_DAY } from "../../common/config";
import { dateToStr } from "../../common/utils";
import { File } from "../../common/data/domain/file";
import { TaskDataMerge } from "../../common/data/domain/taskDataMerge";
import { getMergeDataListForCompany, getMergeDataListForJob, getMergeDataListForCompanyTag } from "../../common/service/dataSyncService";
import JSZip from "jszip";
import { SearchDataSharePartnerBO } from "../../common/data/bo/searchDataSharePartnerBO";

dayjs.extend(minMax);
export const TaskService = {

}

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
    searchParam.pageNum = 1;
    searchParam.pageSize = MAX_RECORD_COUNT;
    searchParam.orderByColumn = "updateDatetime";
    searchParam.orderBy = "DESC";
    return (await DataSharePartnerApi.searchDataSharePartner(searchParam, { invokeEnv: BACKGROUND })).items;
}

export async function calculateUploadTask({ userName, repoName }) {
    //根据今天的时间判断最新的job,company,companyTag任务是否已经存在
    let taskDataUploadMaxDateString = await TaskDataUploadApi.taskDataUploadGetMaxEndDatetime({}, { invokeEnv: BACKGROUND });
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
                await DBApi.dbBeginTransaction({}, { invokeEnv: BACKGROUND });
                await addDataUploadTask({
                    type: TASK_TYPE_JOB_DATA_UPLOAD, startDatetime: dataSyncStartDatetime, endDatetime: today, userName, repoName,
                    total: (await getJobData({ startDatetime: dataSyncStartDatetime, endDatetime: today })).total
                });
                await addDataUploadTask({
                    type: TASK_TYPE_COMPANY_DATA_UPLOAD, startDatetime: dataSyncStartDatetime, endDatetime: today, userName, repoName,
                    total: (await getCompanyData({ startDatetime: dataSyncStartDatetime, endDatetime: today })).total
                });
                //上传所有的公司标签记录，以便全量更新
                await addDataUploadTask({
                    type: TASK_TYPE_COMPANY_TAG_DATA_UPLOAD, startDatetime: null, endDatetime: null, userName, repoName,
                    total: (await getCompanyTagData({ startDatetime: null, endDatetime: null })).total
                });
                await DBApi.dbCommitTransaction({}, { invokeEnv: BACKGROUND });
            } catch (e) {
                await DBApi.dbRollbackTransaction({}, { invokeEnv: BACKGROUND });
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
        searchParam.pageNum = 1;
        searchParam.pageSize = MAX_RECORD_COUNT;
        searchParam.userName = userName;
        searchParam.repoName = repoName;
        searchParam.startDatetime = startDatetimeForSearchTaskDownload;
        searchParam.endDatetime = dayjs(endDatetimeForSearchTaskDownload).add(1, "day").toDate();
        searchParam.orderByColumn = "createDatetime";
        searchParam.orderBy = "ASC";
        let taskDataDownloadResult = await TaskDataDownloadApi.searchTaskDataDownload(searchParam, { invokeEnv: BACKGROUND });
        let taskDataDownloadMap = new Map();
        let taskDataDownloadResultItems = taskDataDownloadResult.items;
        if (taskDataDownloadResultItems.length > 0) {
            for (let i = 0; i < taskDataDownloadResultItems.length; i++) {
                let item = taskDataDownloadResultItems[i];
                taskDataDownloadMap.set(item.datetime, null);
            }
        } else {
            //skip
        }
        let filterDay = allDay.filter(item => { return !taskDataDownloadMap.has(dateToStr(item)) });
        debugLog(`[TASK DATA DOWNLOAD CALCULATE] filterDay length = ${filterDay.length} to add record,${filterDay.toString()}`)
        //将缺失的日期任务添加到数据
        if (filterDay.length > 0) {
            try {
                await DBApi.dbBeginTransaction({}, { invokeEnv: BACKGROUND });
                for (let i = 0; i < filterDay.length; i++) {
                    let day = filterDay[i];
                    await addDataDownloadTask({ type: TASK_TYPE_JOB_DATA_DOWNLOAD, datetime: day, userName, repoName, })
                    await addDataDownloadTask({ type: TASK_TYPE_COMPANY_DATA_DOWNLOAD, datetime: day, userName, repoName, })
                    await addDataDownloadTask({ type: TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD, datetime: day, userName, repoName, })
                }
                await DBApi.dbCommitTransaction({}, { invokeEnv: BACKGROUND });
            } catch (e) {
                await DBApi.dbRollbackTransaction({}, { invokeEnv: BACKGROUND });
                errorLog(e);
            }
        } else {
            debugLog(`[TASK DATA UPLOAD CALCULATE] no newer record for ${userName}/${repoName}`);
        }
    } else {
        debugLog(`[TASK DATA UPLOAD CALCULATE] repo(${userName}/${repoName}) has't match record `);
    }
}

const TASK_HANDLE_MAP = new Map();

const DATA_TYPE_NAME_JOB = "job";
const DATA_TYPE_NAME_COMPANY = "company";
const DATA_TYPE_NAME_COMPANY_TAG = "company_tag";

TASK_HANDLE_MAP.set(TASK_TYPE_JOB_DATA_UPLOAD, async (dataId) => {
    return uploadDataByDataId(dataId, DATA_TYPE_NAME_JOB, getJobData, jobDataToExcelJSONArray);
})
TASK_HANDLE_MAP.set(TASK_TYPE_COMPANY_DATA_UPLOAD, async (dataId) => {
    return uploadDataByDataId(dataId, DATA_TYPE_NAME_COMPANY, getCompanyData, companyDataToExcelJSONArray);
})
TASK_HANDLE_MAP.set(TASK_TYPE_COMPANY_TAG_DATA_UPLOAD, async (dataId) => {
    return uploadDataByDataId(dataId, DATA_TYPE_NAME_COMPANY_TAG, getCompanyTagData, companyTagDataToExcelJSONArray);
})
TASK_HANDLE_MAP.set(TASK_TYPE_JOB_DATA_DOWNLOAD, async (dataId) => {
    return downloadDataByDataId(dataId, DATA_TYPE_NAME_JOB, TASK_TYPE_JOB_DATA_MERGE);
})
TASK_HANDLE_MAP.set(TASK_TYPE_COMPANY_DATA_DOWNLOAD, async (dataId) => {
    return downloadDataByDataId(dataId, DATA_TYPE_NAME_COMPANY, TASK_TYPE_COMPANY_DATA_MERGE);
})
TASK_HANDLE_MAP.set(TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD, async (dataId) => {
    return downloadDataByDataId(dataId, DATA_TYPE_NAME_COMPANY_TAG, TASK_TYPE_COMPANY_TAG_DATA_MERGE);
})
TASK_HANDLE_MAP.set(TASK_TYPE_JOB_DATA_MERGE, async (dataId) => {
    return mergeDataByDataId(dataId, TASK_TYPE_JOB_DATA_MERGE, DATA_TYPE_NAME_JOB, JOB_FILE_HEADER, jobExcelDataToObjectArray, async (items) => {
        //处理数据冲突问题，根据创建时间来判断
        //处理公司名全称问题
        let targetList = await getMergeDataListForJob(items, "jobId", async (ids) => {
            return JobApi.jobGetByIds(ids, { invokeEnv: BACKGROUND });
        });
        await JobApi.batchAddOrUpdateJob(targetList, { invokeEnv: BACKGROUND });
        return targetList.length;
    });
})
TASK_HANDLE_MAP.set(TASK_TYPE_COMPANY_DATA_MERGE, async (dataId) => {
    return mergeDataByDataId(dataId, TASK_TYPE_COMPANY_DATA_MERGE, DATA_TYPE_NAME_COMPANY, COMPANY_FILE_HEADER, companyExcelDataToObjectArray, async (items) => {
        //处理数据冲突问题，根据数据来源更新时间来判断
        let targetList = await getMergeDataListForCompany(items, "companyId", async (ids) => {
            return CompanyApi.companyGetByIds(ids, { invokeEnv: BACKGROUND });
        });
        await CompanyApi.batchAddOrUpdateCompany(targetList, { invokeEnv: BACKGROUND });
        return targetList.length;
    });
})
TASK_HANDLE_MAP.set(TASK_TYPE_COMPANY_TAG_DATA_MERGE, async (dataId) => {
    return mergeDataByDataId(dataId, TASK_TYPE_COMPANY_TAG_DATA_MERGE, DATA_TYPE_NAME_COMPANY_TAG, COMPANY_TAG_FILE_HEADER, companyTagExcelDataToObjectArray, async (items) => {
        //处理数据冲突问题，合并标签
        let targetList = await getMergeDataListForCompanyTag(items, async (ids) => {
            return await CompanyApi.getAllCompanyTagDTOByCompanyIds(ids, { invokeEnv: BACKGROUND });
        })
        await CompanyApi.batchAddOrUpdateCompanyTag(targetList, { invokeEnv: BACKGROUND });
        return targetList.length;
    });
})

async function isLogin() {
    return (await getToken()) ? true : false;
}

export async function runTask() {
    debugLog(`[TASK RUN] starting`)
    //获取按创建时间升序需要执行的任务
    let searchParam = new SearchTaskBO();
    searchParam.pageNum = 1;
    searchParam.pageSize = MAX_RECORD_COUNT;
    searchParam.statusList = [TASK_STATUS_READY, TASK_STATUS_RUNNING, TASK_STATUS_ERROR];
    // searchParam.endRetryCount = TASK_STATUS_ERROR_MAX_RETRY_COUNT;
    searchParam.orderByColumn = "createDatetime";
    searchParam.orderBy = "ASC";
    let taskResult = await TaskApi.searchTask(searchParam, { invokeEnv: BACKGROUND });
    debugLog(`[TASK RUN] task count = ${taskResult.total}`)
    if (taskResult.total > 0) {
        for (let i = 0; i < taskResult.items.length; i++) {
            let taskItem = taskResult.items[i];
            debugLog(`[TASK RUN] current task seq = ${i}, id = ${taskItem.id},type = ${taskItem.type},retryCount = ${taskItem.retryCount}`)
            taskItem.retryCount = taskItem.retryCount + 1;
            let startDatetime = dayjs();
            try {
                taskItem.status = TASK_STATUS_RUNNING;
                await TaskApi.taskAddOrUpdate(taskItem, { invokeEnv: BACKGROUND });
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
                    await TaskApi.taskAddOrUpdate(taskItem, { invokeEnv: BACKGROUND });
                } else {
                    throw `[TASK RUN] not supported task type = ${taskItem.type}`
                }
            } catch (e) {
                debugLog(e);
                //执行异常，补充异常信息
                taskItem.status = TASK_STATUS_ERROR;
                taskItem.errorReason = JSON.stringify(e);
                taskItem.costTime = dayjs().diff(startDatetime);
                await TaskApi.taskAddOrUpdate(taskItem, { invokeEnv: BACKGROUND });
            }
        }
    } else {
        debugLog(`[TASK RUN] skip task run`)
    }
    debugLog(`[TASK RUN] end`)
}

async function addDataDownloadTask({ type, datetime, userName, repoName }) {
    let taskDataDownload = new TaskDataDownload();
    taskDataDownload.type = type;
    taskDataDownload.username = userName;;
    taskDataDownload.reponame = repoName;
    taskDataDownload.datetime = datetime;
    let savedTaskDataDownload = await TaskDataDownloadApi.taskDataDownloadAddOrUpdate(taskDataDownload, { invokeEnv: BACKGROUND });
    let task = new Task();
    task.type = type;
    task.dataId = savedTaskDataDownload.id;
    task.retryCount = 0;
    task.costTime = 0;
    task.status = TASK_STATUS_READY;
    await TaskApi.taskAddOrUpdate(task, { invokeEnv: BACKGROUND })
}

async function addDataUploadTask({ type, startDatetime, endDatetime, userName, repoName, total }) {
    let taskDataUpload = new TaskDataUpload();
    taskDataUpload.type = type;
    taskDataUpload.username = userName;;
    taskDataUpload.reponame = repoName;
    taskDataUpload.startDatetime = startDatetime;
    taskDataUpload.endDatetime = endDatetime;
    taskDataUpload.dataCount = total;
    let savedTaskDataUpload = await TaskDataUploadApi.taskDataUploadAddOrUpdate(taskDataUpload, { invokeEnv: BACKGROUND });
    let task = new Task();
    task.type = type;
    task.dataId = savedTaskDataUpload.id;
    task.retryCount = 0;
    task.costTime = 0;
    task.status = TASK_STATUS_READY;
    await TaskApi.taskAddOrUpdate(task, { invokeEnv: BACKGROUND })
}

async function convertJsonObjectToExcelData(result) {
    const ws = utils.json_to_sheet(result);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Data");
    return writeXLSX(wb, { type: "buffer" });
}

async function getJobData({ startDatetime, endDatetime }) {
    let searchParam = new SearchJobBO();
    searchParam.pageNum = 1;
    searchParam.pageSize = MAX_RECORD_COUNT;
    searchParam.startDatetimeForUpdate = startDatetime;
    searchParam.endDatetimeForUpdate = endDatetime;
    searchParam.orderByColumn = "updateDatetime";
    searchParam.orderBy = "DESC";
    return JobApi.searchJob(searchParam, {
        invokeEnv: BACKGROUND,
    });
}

async function getCompanyData({ startDatetime, endDatetime }) {
    let searchParam = new SearchCompanyBO();
    searchParam.pageNum = 1;
    searchParam.pageSize = MAX_RECORD_COUNT;
    searchParam.startDatetimeForUpdate = startDatetime;
    searchParam.endDatetimeForUpdate = endDatetime;
    searchParam.orderByColumn = "updateDatetime";
    searchParam.orderBy = "DESC";
    return CompanyApi.searchCompany(searchParam, {
        invokeEnv: BACKGROUND,
    });
}

async function getCompanyTagData({ startDatetime, endDatetime }) {
    let searchParam = new SearchCompanyTagBO();
    searchParam.pageNum = 1;
    searchParam.pageSize = MAX_RECORD_COUNT;
    searchParam.startDatetimeForUpdate = startDatetime;
    searchParam.endDatetimeForUpdate = endDatetime;
    searchParam.orderByColumn = "updateDatetime";
    searchParam.orderBy = "DESC";
    return CompanyApi.searchCompanyTag(searchParam, {
        invokeEnv: BACKGROUND,
    });
}

async function uploadData({ userName, repoName, dirPath, dataTypeName, dataList, jsonObjectToExcelJsonArrayFunction }) {
    if (dataList.length > 0) {
        infoLog(`[Task Data Upload ${dataTypeName}] data length = ${dataList.length}`);
        let result = jsonObjectToExcelJsonArrayFunction(dataList);
        let excelData = await convertJsonObjectToExcelData(result);
        let zipData = await zipFileToBase64(dataTypeName, excelData);
        let filePath = `${dirPath}/${dataTypeName}.zip`;
        try {
            let result = await GithubApi.createFileContent(userName, repoName, filePath, zipData, "upload job data", { getTokenFunction: getToken, setTokenFunction: setToken, });
            infoLog(`[Task Data Upload ${dataTypeName}] create file ${filePath} success`);
            return result;
        } catch (e) {
            if (e == EXCEPTION.CREATION_FAILED) {
                infoLog(`[Task Data Upload ${dataTypeName}] create file ${filePath} failure`);
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
    const taskDataMerge = await TaskDataMergeApi.taskDataMergeGetById(dataId, { invokeEnv: BACKGROUND });
    debugLog(`[TASK DATA MERGE] taskDataMerge dataId = ${taskDataMerge.dataId}`);
    const file = await FileApi.fileGetById(taskDataMerge.dataId, { invokeEnv: BACKGROUND });
    debugLog(`[TASK DATA MERGE] file id = ${file.id},name = ${file.name}`);
    let base64Content = file.content;
    let excelFileBufferData = await getExcelDataFromZipFile(base64Content, dataTypeName);
    let wb = read(excelFileBufferData, { type: "buffer" });
    let validResultObject = validImportData(utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }), fileHeader);
    if (!validResultObject.validResult) {
        debugLog(`[TASK DATA MERGE] valid file name = ${file.name}, id = ${file.id} failure`);
        return `职位文件校验失败，缺少数据列(${validResultObject.lackColumn.length}):${validResultObject.lackColumn.join(",")}`;
    }
    debugLog(`[TASK DATA MERGE] valid file name = ${file.name}, id = ${file.id} success`);
    const data = utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 2 });
    try {
        await DBApi.dbBeginTransaction({}, { invokeEnv: BACKGROUND });
        let count = await dataInsertFunction(excelDataToObjectArrayFunction(data));
        taskDataMerge.dataCount = count;
        await TaskDataMergeApi.taskDataMergeAddOrUpdate(taskDataMerge, { invokeEnv: BACKGROUND });
        await DBApi.dbCommitTransaction({}, { invokeEnv: BACKGROUND });
        debugLog(`[TASK DATA MERGE] merge file name = ${file.name}, id = ${file.id} success,data count = ${count}`);
    } catch (e) {
        await DBApi.dbRollbackTransaction({}, { invokeEnv: BACKGROUND });
        throw e;
    }
    //TODO 考虑自动删除文件内容，以便节省存储空间
    //TODO 如果删除文件，则注意添加事务
}

async function getExcelDataFromZipFile(base64Content, dataTypeName) {
    let promise = new Promise((resolve, reject) => {
        JSZip.loadAsync(base64Content, { base64: true }).then(async zip => {
            let zipFile = zip.file(`${dataTypeName}.xlsx`);
            resolve(await zipFile.async("arraybuffer"));
        }).catch(e => {
            reject(e);
        })
    });
    return promise;
}

async function downloadDataByDataId(dataId, dataTypeName, taskType) {
    if (!(await isLogin())) {
        infoLog(`[TASK HANDLE]No login info, skip run task dataId = ${dataId}, dataTypeName = ${dataTypeName}`)
        throw EXCEPTION.NO_LOGIN;
    }
    let taskData = await TaskDataDownloadApi.taskDataDownloadGetById(dataId, { invokeEnv: BACKGROUND });
    let userName = taskData.username;
    let repoName = taskData.reponame;
    let datetime = taskData.datetime;
    const path = getPathByDatetime({ datetime }) + `/${dataTypeName}.zip`;
    let content = null;
    try {
        content = await GithubApi.listRepoContents(userName, repoName, path, { getTokenFunction: getToken, setTokenFunction: setToken, });
        if (content.type == "file") {
            try {
                await DBApi.dbBeginTransaction({}, { invokeEnv: BACKGROUND });
                const file = new File();
                file.name = content.name;
                file.sha = content.sha;
                file.encoding = content.encoding;
                file.content = content.content;
                file.size = content.size;
                file.type = content.type;
                const savedFile = await FileApi.fileAddOrUpdate(file, { invokeEnv: BACKGROUND });
                infoLog(`[TASK DOWNLOAD DATA] save file to database from ${userName}.${repoName}.${path}, id = ${savedFile.id}`);
                //添加数据合并任务
                const taskDataMerge = new TaskDataMerge();
                taskDataMerge.type = taskType;
                taskDataMerge.username = userName;
                taskDataMerge.reponame = repoName;
                taskDataMerge.datetime = datetime;
                taskDataMerge.dataId = savedFile.id;
                const savedTaskDataMerge = await TaskDataMergeApi.taskDataMergeAddOrUpdate(taskDataMerge, { invokeEnv: BACKGROUND })
                infoLog(`[TASK DOWNLOAD DATA] merge task to database from ${userName}.${repoName}.${path}, id = ${savedTaskDataMerge.id}, dataId = ${dataId}`);
                let task = new Task();
                task.type = taskType;
                task.dataId = savedTaskDataMerge.id;
                task.retryCount = 0;
                task.costTime = 0;
                task.status = TASK_STATUS_READY;
                const savedTask = await TaskApi.taskAddOrUpdate(task, { invokeEnv: BACKGROUND })
                infoLog(`[TASK DOWNLOAD DATA] add task to database from task type = ${taskType}, dataId = ${task.dataId}, id = ${savedTask.id}`);
                await DBApi.dbCommitTransaction({}, { invokeEnv: BACKGROUND });
            } catch (e) {
                await DBApi.dbRollbackTransaction({}, { invokeEnv: BACKGROUND });
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
    let taskDataUpload = await TaskDataUploadApi.taskDataUploadGetById(dataId, { invokeEnv: BACKGROUND });
    let userName = taskDataUpload.username;
    let repoName = taskDataUpload.reponame;
    let startDatetime = taskDataUpload.startDatetime;
    let endDatetime = taskDataUpload.endDatetime;
    let dirPath = getPathByDatetime({ endDatetime });
    await createRepoIfNotExists({ userName, repoName });
    await uploadData({
        userName, repoName, dirPath,
        dataTypeName,
        dataList: (await getDataFunction({ startDatetime, endDatetime })).items,
        jsonObjectToExcelJsonArrayFunction
    });
}

function getPathByDatetime({ datetime }) {
    return `/${dayjs(datetime).format("YYYY")}/${dayjs(datetime).format("MM-DD")}`;
}
