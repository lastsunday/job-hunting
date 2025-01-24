import {
    DATA_TYPE_NAME_COMPANY,
    DATA_TYPE_NAME_COMPANY_TAG,
    DATA_TYPE_NAME_JOB,
    DATA_TYPE_NAME_JOB_TAG,
    TASK_STATUS_READY,
    TASK_TYPE_COMPANY_DATA_UPLOAD,
    TASK_TYPE_COMPANY_TAG_DATA_UPLOAD,
    TASK_TYPE_JOB_DATA_UPLOAD,
    TASK_TYPE_JOB_TAG_DATA_UPLOAD
} from "@/common";
import { EXCEPTION, GithubApi } from "@/common/api/github";
import { CompanyTagExportBO } from "@/common/data/bo/companyTagExportBO";
import { JobTagExportBO } from "@/common/data/bo/jobTagExportBO";
import { SearchCompanyBO } from "@/common/data/bo/searchCompanyBO";
import { SearchJobBO } from "@/common/data/bo/searchJobBO";
import { Task } from "@/common/data/domain/task";
import { TaskDataUpload } from "@/common/data/domain/taskDataUpload";
import {
    companyDataToExcelJSONArray,
    companyTagDataToExcelJSONArray,
    jobDataToExcelJSONArray,
    jobTagDataToExcelJSONArray
} from "@/common/excel";
import { debugLog, errorLog, infoLog } from "@/common/log";
import dayjs from "dayjs";
import minMax from 'dayjs/plugin/minMax'; // ES 2015
import JSZip from "jszip";
import { utils, writeXLSX } from "xlsx";
import { getDb } from "../../database";
import { _searchCompany } from "../companyService";
import { _companyTagExport } from "../companyTagService";
import { _searchJob } from "../jobService";
import { _jobTagExport } from "../jobTagService";
import { _taskDataUploadAddOrUpdate, _taskDataUploadGetById, _taskDataUploadGetMaxEndDatetime } from "../taskDataUploadService";
import { _taskAddOrUpdate } from "../taskService";
import { getPathByDatetime, getToken, isLogin, setToken } from "./index";
dayjs.extend(minMax);

// Calculate
export async function calculateUploadTask({ userName, repoName } = {}) {
    //根据今天的时间判断最新的job,company,companyTag任务是否已经存在
    let taskDataUploadMaxDateString = await _taskDataUploadGetMaxEndDatetime();
    let taskDataUploadMaxDate = taskDataUploadMaxDateString ? dayjs(taskDataUploadMaxDateString) : null;
    let today = dayjs(new Date()).startOf("day");
    if (today.isSame(taskDataUploadMaxDate)) {
        //如果存在
        infoLog(`[TASK DATA UPLOAD CALCULATE] taskDataUploadMaxDate is today = ${taskDataUploadMaxDate}`)
        infoLog(`[TASK DATA UPLOAD CALCULATE] skip add data upload record`)
        //skip
    } else {
        infoLog(`[TASK DATA UPLOAD CALCULATE] taskDataUploadMaxDate(${taskDataUploadMaxDate}) not equal today(${today})`)
        infoLog(`[TASK DATA UPLOAD CALCULATE] add data upload record starting`)
        //如果不存在
        //获取仓库中最新数据上传的时间
        try {
            let repoMaxDate = await calculateRepoMaxUploadDate({
                userName, repoName
            })
            //计算数据项开始时间,取最小值(数据库时间,仓库时间)
            let dataSyncStartDatetime = dayjs.min(taskDataUploadMaxDate, dayjs(repoMaxDate));
            infoLog(`[TASK DATA UPLOAD CALCULATE] dataSyncStartDatetime = ${dataSyncStartDatetime}`)
            try {
                await (await getDb()).transaction(async (tx) => {
                    infoLog(`[TASK DATA UPLOAD CALCULATE] add data upload task ${userName}/${repoName} startDatetime=${dayjs(dataSyncStartDatetime).format()} endDatetime=${dayjs(today).format()} starting`)
                    infoLog(`[TASK DATA UPLOAD CALCULATE] add data upload task ${userName}/${repoName} type=${TASK_TYPE_JOB_DATA_UPLOAD}`)
                    await addDataUploadTask({
                        type: TASK_TYPE_JOB_DATA_UPLOAD, startDatetime: dataSyncStartDatetime, endDatetime: today, userName, repoName, connection: tx,
                        total: (await getJobData({ pageNum: 1, pageSize: 1, startDatetime: dataSyncStartDatetime, endDatetime: today, connection: tx })).total,
                    });
                    infoLog(`[TASK DATA UPLOAD CALCULATE] add data upload task ${userName}/${repoName} type=${TASK_TYPE_COMPANY_DATA_UPLOAD}`)
                    await addDataUploadTask({
                        type: TASK_TYPE_COMPANY_DATA_UPLOAD, startDatetime: dataSyncStartDatetime, endDatetime: today, userName, repoName, connection: tx,
                        total: (await getCompanyData({ pageNum: 1, pageSize: 1, startDatetime: dataSyncStartDatetime, endDatetime: today, connection: tx })).total
                    });
                    infoLog(`[TASK DATA UPLOAD CALCULATE] add data upload task ${userName}/${repoName} type=${TASK_TYPE_COMPANY_TAG_DATA_UPLOAD}`)
                    await addDataUploadTask({
                        type: TASK_TYPE_COMPANY_TAG_DATA_UPLOAD, startDatetime: dataSyncStartDatetime, endDatetime: today, userName, repoName, connection: tx,
                        total: (await getCompanyTagData({ pageNum: 1, pageSize: 1, startDatetime: dataSyncStartDatetime, endDatetime: today, connection: tx })).total
                    });
                    infoLog(`[TASK DATA UPLOAD CALCULATE] add data upload task ${userName}/${repoName} type=${TASK_TYPE_JOB_TAG_DATA_UPLOAD}`)
                    await addDataUploadTask({
                        type: TASK_TYPE_JOB_TAG_DATA_UPLOAD, startDatetime: dataSyncStartDatetime, endDatetime: today, userName, repoName, connection: tx,
                        total: (await getJobTagData({ pageNum: 1, pageSize: 1, startDatetime: dataSyncStartDatetime, endDatetime: today, connection: tx })).total
                    });
                    infoLog(`[TASK DATA UPLOAD CALCULATE] add data upload task ${userName}/${repoName} end`)
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

// Handle
export function setup(handleMap) {
    handleMap.set(TASK_TYPE_JOB_DATA_UPLOAD, async (dataId) => {
        return uploadDataByDataId(dataId, DATA_TYPE_NAME_JOB, getJobData, jobDataToExcelJSONArray);
    })
    handleMap.set(TASK_TYPE_COMPANY_DATA_UPLOAD, async (dataId) => {
        return uploadDataByDataId(dataId, DATA_TYPE_NAME_COMPANY, getCompanyData, companyDataToExcelJSONArray);
    })
    handleMap.set(TASK_TYPE_COMPANY_TAG_DATA_UPLOAD, async (dataId) => {
        return uploadDataByDataId(dataId, DATA_TYPE_NAME_COMPANY_TAG, getCompanyTagData, companyTagDataToExcelJSONArray);
    })
    handleMap.set(TASK_TYPE_JOB_TAG_DATA_UPLOAD, async (dataId) => {
        return uploadDataByDataId(dataId, DATA_TYPE_NAME_JOB_TAG, getJobTagData, jobTagDataToExcelJSONArray);
    })
}

export async function uploadDataByDataId(dataId, dataTypeName, getDataFunction, jsonObjectToExcelJsonArrayFunction) {
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

async function getJobData({ pageNum = null, pageSize = null, startDatetime = null, endDatetime = null, connection = null } = {}) {
    let searchParam = new SearchJobBO();
    searchParam.pageNum = pageNum;
    searchParam.pageSize = pageSize;
    searchParam.startDatetimeForUpdate = startDatetime;
    searchParam.endDatetimeForUpdate = endDatetime;
    searchParam.orderByColumn = "updateDatetime";
    searchParam.orderBy = "DESC";
    return _searchJob({
        param: searchParam,
        connection
    });
}

async function getCompanyData({ pageNum = null, pageSize = null, startDatetime, endDatetime, connection = null } = {}) {
    let searchParam = new SearchCompanyBO();
    searchParam.pageNum = pageNum;
    searchParam.pageSize = pageSize;
    searchParam.startDatetimeForUpdate = startDatetime;
    searchParam.endDatetimeForUpdate = endDatetime;
    searchParam.orderByColumn = "updateDatetime";
    searchParam.orderBy = "DESC";
    return _searchCompany({
        param: searchParam,
        connection
    });
}

async function getCompanyTagData({ pageNum = null, pageSize = null, startDatetime, endDatetime, connection = null } = {}) {
    let searchParam = new CompanyTagExportBO();
    searchParam.pageNum = pageNum;
    searchParam.pageSize = pageSize;
    searchParam.source = "";
    searchParam.startDatetimeForUpdate = startDatetime;
    searchParam.endDatetimeForUpdate = endDatetime;
    return await _companyTagExport({
        param: searchParam,
        connection
    });
}

async function getJobTagData({ pageNum = null, pageSize = null, startDatetime, endDatetime, connection = null } = {}) {
    let searchParam = new JobTagExportBO();
    searchParam.pageNum = pageNum;
    searchParam.pageSize = pageSize;
    searchParam.source = "";
    searchParam.startDatetimeForUpdate = startDatetime;
    searchParam.endDatetimeForUpdate = endDatetime;
    return await _jobTagExport({
        param: searchParam,
        connection
    })
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

async function convertJsonObjectToExcelData(result) {
    const ws = utils.json_to_sheet(result);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Data");
    return writeXLSX(wb, { type: "buffer" });
}