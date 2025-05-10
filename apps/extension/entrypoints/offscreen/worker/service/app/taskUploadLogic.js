import {
    TASK_STATUS_READY,
    TASK_TYPE_AND_FILE_NAME_MAP,
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
import { convertJsonObjectToExcelData } from "@/common/excel";
import { infoLog } from "@/common/log";
import { zipFileToBase64 } from "@/common/zip";
import dayjs from "dayjs";
import minMax from 'dayjs/plugin/minMax'; // ES 2015
import { getDb } from "../../database";
import { _searchCompany } from "../companyService";
import { _companyTagExport } from "../companyTagService";
import { _searchJob } from "../jobService";
import { _jobTagExport } from "../jobTagService";
import { _taskDataUploadAddOrUpdate } from "../taskDataUploadService";
import { _taskAddOrUpdate } from "../taskService";
import { getToken, setToken } from "./index";
dayjs.extend(minMax);

export const saveTask = async ({ type, startDatetime, endDatetime, userName, repoName, getTotalByTaskType = _getTotalByTaskType }) => {
    await (await getDb()).transaction(async (tx) => {
        const total = await getTotalByTaskType({ type, startDatetime, endDatetime, connection: tx });
        await addDataUploadTask({ type, startDatetime, endDatetime, userName, repoName, connection: tx, total });
        infoLog(`[TASK DATA UPLOAD CALCULATE] add data upload task ${userName}/${repoName} type=${type}`)
    });
}

export const _getTotalByTaskType = async ({ type, startDatetime, endDatetime, connection }) => {
    if (type == TASK_TYPE_JOB_DATA_UPLOAD) {
        return (await getJobData({ pageNum: 1, pageSize: 1, startDatetime, endDatetime, connection })).total;
    } else if (type == TASK_TYPE_COMPANY_DATA_UPLOAD) {
        return (await getCompanyData({ pageNum: 1, pageSize: 1, startDatetime, endDatetime, connection })).total;
    } else if (type == TASK_TYPE_COMPANY_TAG_DATA_UPLOAD) {
        return (await getCompanyTagData({ pageNum: 1, pageSize: 1, startDatetime, endDatetime, connection })).total;
    } else if (type == TASK_TYPE_JOB_TAG_DATA_UPLOAD) {
        return (await getJobTagData({ pageNum: 1, pageSize: 1, startDatetime, endDatetime, connection })).total;
    } else {
        throw `not supported type = ${type}`;
    }
}

export async function addDataUploadTask({ type, startDatetime, endDatetime, userName, repoName, total, connection = null } = {}) {
    const taskDataUpload = new TaskDataUpload();
    taskDataUpload.type = type;
    taskDataUpload.username = userName;;
    taskDataUpload.reponame = repoName;
    taskDataUpload.startDatetime = startDatetime;
    taskDataUpload.endDatetime = endDatetime;
    taskDataUpload.dataCount = total;
    const savedTaskDataUpload = await _taskDataUploadAddOrUpdate({ param: taskDataUpload, connection });
    const task = new Task();
    task.type = type;
    task.dataId = savedTaskDataUpload.id;
    task.retryCount = 0;
    task.costTime = 0;
    task.status = TASK_STATUS_READY;
    await _taskAddOrUpdate({ param: task, connection });
}

export async function calculateRepoMaxUploadDate({
    userName, repoName, type,
    getPathMap = async ({ userName, repoName }) => {
        return await lsTree({
            url: `${GITHUB_URL}/${userName}/${repoName}`,
            ref: "HEAD",
            getResponseAsyncFunction: async ({ url, method, headers, body }) => {
                return githubFetch(url, { method, headers, body });
            }
        })
    } }) {
    if (TASK_TYPE_AND_FILE_NAME_MAP.has(type)) {
        const pathMap = await getPathMap({ userName, repoName });
        const fileName = TASK_TYPE_AND_FILE_NAME_MAP.get(type);
        const pathKeys = pathMap.keys();
        const filterResult = [];
        pathKeys.forEach(path => {
            const matchPath = path.match(new RegExp(`\\/(?<YYYY>[0-9]{4})\\/(?<MM>[0-1][0-9])-(?<DD>[0-3][0-9])\\/${fileName}\\..*`));
            if (matchPath) {
                const { YYYY, MM, DD } = matchPath.groups;
                filterResult.push(dayjs(`${YYYY}-${MM}-${DD}`));
            }
        });
        return dayjs.max(filterResult);
    } else {
        throw `can't find file name by type = ${type}`;
    }
}

export async function getJobData({ pageNum = null, pageSize = null, startDatetime = null, endDatetime = null, connection = null } = {}) {
    const searchParam = new SearchJobBO();
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

export async function getCompanyData({ pageNum = null, pageSize = null, startDatetime, endDatetime, connection = null } = {}) {
    const searchParam = new SearchCompanyBO();
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

export async function getCompanyTagData({ pageNum = null, pageSize = null, startDatetime, endDatetime, connection = null } = {}) {
    const searchParam = new CompanyTagExportBO();
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

export async function getJobTagData({ pageNum = null, pageSize = null, startDatetime, endDatetime, connection = null } = {}) {
    const searchParam = new JobTagExportBO();
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

export async function uploadData({ userName, repoName, dirPath, dataTypeName, dataList, jsonObjectToExcelJsonArrayFunction } = {}) {
    if (dataList.length > 0) {
        infoLog(`[Task Data Upload ${dataTypeName}] data length = ${dataList.length}`);
        const result = jsonObjectToExcelJsonArrayFunction(dataList);
        const excelData = await convertJsonObjectToExcelData(result);
        const zipData = await zipFileToBase64(dataTypeName, excelData);
        const filePath = `${dirPath}/${dataTypeName}.zip`;
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
