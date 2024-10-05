import { debugLog, errorLog, infoLog, isDebug } from "../../common/log"
import { SearchJobBO } from "../../common/data/bo/searchJobBO";
import { SearchCompanyBO } from "../../common/data/bo/searchCompanyBO";
import { SearchCompanyTagBO } from "../../common/data/bo/searchCompanyTagBO";
import { JobApi, CompanyApi, TaskDataUploadApi, DBApi, TaskApi } from "../../common/api";
import { BACKGROUND } from "../../common/api/bridgeCommon";
import { MAX_RECORD_COUNT, TASK_STATUS_READY, TASK_TYPE_JOB_DATA_UPLOAD, TASK_TYPE_COMPANY_DATA_UPLOAD, TASK_TYPE_COMPANY_TAG_DATA_UPLOAD, TASK_STATUS_ERROR, TASK_STATUS_RUNNING, TASK_STATUS_FINISHED } from "../../common";
import { utils, writeXLSX } from "xlsx";
import { jobDataToExcelJSONArray, companyDataToExcelJSONArray, companyTagDataToExcelJSONArray } from "../../common/excel";
import { EXCEPTION, GithubApi } from "../../common/api/github";
import { getToken, setToken } from "./authService";
import dayjs from "dayjs";
import minMax from 'dayjs/plugin/minMax' // ES 2015
import { Task } from "../../common/data/domain/task";
import { TaskDataUpload } from "../../common/data/domain/taskDataUpload";
import { SearchTaskBO } from "../../common/data/bo/searchTaskBO";
import { TASK_STATUS_ERROR_MAX_RETRY_COUNT } from "../../common/config";

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

export async function calculateTask({ userName, repoName }) {
    //根据今天的时间判断最新的job,company,companyTag任务是否已经存在
    let taskDataUploadMaxDateString = await TaskDataUploadApi.taskDataUploadGetMaxEndDatetime({}, { invokeEnv: BACKGROUND });
    let taskDataUploadMaxDate = taskDataUploadMaxDateString ? dayjs(taskDataUploadMaxDateString) : null;
    let today = dayjs(new Date()).startOf("day");
    if (today.isSame(taskDataUploadMaxDate)) {
        //如果存在
        debugLog(`[TASK DATA] taskDataUploadMaxDate is today = ${taskDataUploadMaxDate}`)
        debugLog(`[TASK DATA] skip add data upload record`)
        //skip
    } else {
        debugLog(`[TASK DATA] taskDataUploadMaxDate(${taskDataUploadMaxDate}) not equal today(${today})`)
        debugLog(`[TASK DATA] add data upload record starting`)
        //如果不存在
        //获取仓库中最新数据上传的时间
        try {
            let repoMaxDate = await calculateRepoMaxUploadDate({
                userName, repoName
            })
            //计算数据项开始时间,取最小值(数据库时间,仓库时间)
            let dataSyncStartDatetime = dayjs.min(taskDataUploadMaxDate, dayjs(repoMaxDate));
            debugLog(`[TASK DATA] dataSyncStartDatetime = ${dataSyncStartDatetime}`)
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
                await addDataUploadTask({
                    type: TASK_TYPE_COMPANY_TAG_DATA_UPLOAD, startDatetime: dataSyncStartDatetime, endDatetime: today, userName, repoName,
                    total: (await getCompanyTagData({ startDatetime: dataSyncStartDatetime, endDatetime: today })).total
                });
                await DBApi.dbCommitTransaction({}, { invokeEnv: BACKGROUND });
            } catch (e) {
                await DBApi.dbRollbackTransaction({}, { invokeEnv: BACKGROUND });
                errorLog(e);
            }
        } catch (e) {
            errorLog(e);
        }
        debugLog(`[TASK DATA] add data upload record end`)
    }
}

const TASK_HANDLE_MAP = new Map();

TASK_HANDLE_MAP.set(TASK_TYPE_JOB_DATA_UPLOAD, async (dataId) => {
    return uploadDataByDataId(dataId, "job", getJobData, jobDataToExcelJSONArray);
})
TASK_HANDLE_MAP.set(TASK_TYPE_COMPANY_DATA_UPLOAD, async (dataId) => {
    return uploadDataByDataId(dataId, "company", getCompanyData, companyDataToExcelJSONArray);
})
TASK_HANDLE_MAP.set(TASK_TYPE_COMPANY_TAG_DATA_UPLOAD, async (dataId) => {
    return uploadDataByDataId(dataId, "company_tag", getCompanyTagData, companyTagDataToExcelJSONArray);
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
    searchParam.statusList = [TASK_STATUS_READY, TASK_STATUS_ERROR];
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
                    await TASK_HANDLE_MAP.get(taskItem.type)(taskItem.dataId);
                    taskItem.status = TASK_STATUS_FINISHED;
                    taskItem.costTime = dayjs().diff(startDatetime);
                    await TaskApi.taskAddOrUpdate(taskItem, { invokeEnv: BACKGROUND });
                } else {
                    throw `not supported task type = ${taskItem.type}`
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

async function addDataUploadTask({ type, startDatetime, endDatetime, userName, repoName, total }) {
    let taskDataUploadForJob = new TaskDataUpload();
    taskDataUploadForJob.type = type;
    taskDataUploadForJob.username = userName;;
    taskDataUploadForJob.reponame = repoName;
    taskDataUploadForJob.startDatetime = startDatetime;
    taskDataUploadForJob.endDatetime = endDatetime;
    taskDataUploadForJob.dataCount = total;
    let savedTaskDataUploadForJob = await TaskDataUploadApi.taskDataUploadAddOrUpdate(taskDataUploadForJob, { invokeEnv: BACKGROUND });
    let task = new Task();
    task.type = type;
    task.dataId = savedTaskDataUploadForJob.id;
    task.retryCount = 0;
    task.costTime = 0;
    task.status = TASK_STATUS_READY;
    await TaskApi.taskAddOrUpdate(task, { invokeEnv: BACKGROUND })
}

async function convertJsonObjectToExcelBase64Data(result) {
    const ws = utils.json_to_sheet(result);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Data");
    return writeXLSX(wb, { type: "base64" });
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
        let excelData = await convertJsonObjectToExcelBase64Data(result);
        let filePath = `${dirPath}/${dataTypeName}.xlsx`;
        try {
            let result = await GithubApi.createFileContent(userName, repoName, filePath, excelData, "upload job data", { getTokenFunction: getToken, setTokenFunction: setToken, });
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

async function uploadDataByDataId(dataId, dataTypeName, getDataFunction, jsonObjectToExcelJsonArrayFunction) {
    if (!(await isLogin())) {
        debugLog(`[TASK HANDLE] No login info,skip run task dataId = ${dataId},dataTypeName = ${dataTypeName}`)
        throw EXCEPTION.NO_LOGIN;
    }
    let taskDataUpload = await TaskDataUploadApi.taskDataUploadGetById(dataId, { invokeEnv: BACKGROUND });
    let userName = taskDataUpload.username;
    let repoName = taskDataUpload.reponame;
    let startDatetime = taskDataUpload.startDatetime;
    let endDatetime = taskDataUpload.endDatetime;
    let dirPath = getDirPath({ endDatetime });
    await createRepoIfNotExists({ userName, repoName });
    await uploadData({
        userName, repoName, dirPath,
        dataTypeName,
        dataList: (await getDataFunction({ startDatetime, endDatetime })).items,
        jsonObjectToExcelJsonArrayFunction
    });
}

function getDirPath({ endDatetime }) {
    return `/${dayjs(endDatetime).format("YYYY")}/${dayjs(endDatetime).format("MM-DD")}`;
}
