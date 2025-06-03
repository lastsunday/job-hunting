import {
  TASK_STATUS_READY,
  TASK_TYPE_AND_FILE_NAME_MAP,
  TASK_TYPE_COMPANY_DATA_UPLOAD,
  TASK_TYPE_COMPANY_TAG_DATA_UPLOAD,
  TASK_TYPE_JOB_DATA_UPLOAD,
  TASK_TYPE_JOB_PUBLIC_DATA_UPLOAD,
  TASK_TYPE_JOB_TAG_DATA_UPLOAD
} from "@/common";
import { EXCEPTION, GithubApi, _fetch as githubFetch } from "@/common/api/github";
import { GITHUB_URL, JOB_PUBLIC_MAX_EXPORT_SIZE } from "@/common/config";
import { CompanyTagExportBO } from "@/common/data/bo/companyTagExportBO";
import { JobTagExportBO } from "@/common/data/bo/jobTagExportBO";
import { SearchCompanyBO } from "@/common/data/bo/searchCompanyBO";
import { SearchJobBO } from "@/common/data/bo/searchJobBO";
import { Task } from "@/common/data/domain/task";
import { TaskDataUpload } from "@/common/data/domain/taskDataUpload";
import { convertJsonObjectToExcelData } from "@/common/excel";
import { lsTree } from "@/common/git";
import { infoLog } from "@/common/log";
import { parse } from "@/common/utils/date";
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
import {
  JOB_MAX_EXPORT_SIZE,
  COMPANY_MAX_EXPORT_SIZE,
  JOB_TAG_MAX_EXPORT_SIZE,
  COMPANY_TAG_MAX_EXPORT_SIZE,
} from "@/common/config";
import { queryRepoFileDateList } from "./taskLogic";


export const saveTask = async ({ type, startDatetime, endDatetime, userName, repoName, getTotalByTaskType = _getTotalByTaskType }) => {
  await (await getDb()).transaction(async (tx) => {
    const total = await getTotalByTaskType({ type, startDatetime, endDatetime, connection: tx });
    await addDataUploadTask({ type, startDatetime, endDatetime, userName, repoName, connection: tx, total });
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
  } else if (type == TASK_TYPE_JOB_PUBLIC_DATA_UPLOAD) {
    return (await getJobData({ pageNum: 1, pageSize: 1, startDatetime, endDatetime, connection })).total;
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
  userName, repoName, type, getPathMap
}) {
  const filterResult = await queryRepoFileDateList({ userName, repoName, taskType: type, getPathMap });
  return dayjs.max(filterResult);
}

export async function searchByChunk({ param = {}, connection = null, searchFunction = null, maxChunkCount = null } = {}) {
  if (param.pageNum == null && param.pageSize == null && maxChunkCount) {
    const queryTotalParam = Object.assign(param, { pageNum: 1, pageSize: 0 });
    const queryTotal = (await searchFunction({ param: queryTotalParam, connection })).total;
    const result = [];
    const stepCount = Number.parseInt(queryTotal / maxChunkCount) + ((queryTotal % maxChunkCount > 0 ? 1 : 0));
    for (let i = 0; i < stepCount; i++) {
      const stepQueryParam = Object.assign(param, { pageNum: i + 1, pageSize: maxChunkCount });
      const stepItems = (await searchFunction({ param: stepQueryParam, connection })).items;
      result.push(...stepItems);
    }
    return {
      items: result,
      total: queryTotal,
    };
  } else {
    return await searchFunction({ param, connection })
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
  return searchByChunk({ param: searchParam, connection, searchFunction: _searchJob, maxChunkCount: JOB_MAX_EXPORT_SIZE });
}

export async function getCompanyData({ pageNum = null, pageSize = null, startDatetime, endDatetime, connection = null } = {}) {
  const searchParam = new SearchCompanyBO();
  searchParam.pageNum = pageNum;
  searchParam.pageSize = pageSize;
  searchParam.startDatetimeForUpdate = startDatetime;
  searchParam.endDatetimeForUpdate = endDatetime;
  searchParam.orderByColumn = "updateDatetime";
  searchParam.orderBy = "DESC";
  return searchByChunk({ param: searchParam, connection, searchFunction: _searchCompany, maxChunkCount: COMPANY_MAX_EXPORT_SIZE });
}

export async function getCompanyTagData({ pageNum = null, pageSize = null, startDatetime, endDatetime, connection = null } = {}) {
  const searchParam = new CompanyTagExportBO();
  searchParam.pageNum = pageNum;
  searchParam.pageSize = pageSize;
  searchParam.source = "";
  searchParam.startDatetimeForUpdate = startDatetime;
  searchParam.endDatetimeForUpdate = endDatetime;
  return searchByChunk({ param: searchParam, connection, searchFunction: _companyTagExport, maxChunkCount: COMPANY_TAG_MAX_EXPORT_SIZE });
}

export async function getJobTagData({ pageNum = null, pageSize = null, startDatetime, endDatetime, connection = null } = {}) {
  const searchParam = new JobTagExportBO();
  searchParam.pageNum = pageNum;
  searchParam.pageSize = pageSize;
  searchParam.source = "";
  searchParam.startDatetimeForUpdate = startDatetime;
  searchParam.endDatetimeForUpdate = endDatetime;
  return searchByChunk({ param: searchParam, connection, searchFunction: _jobTagExport, maxChunkCount: JOB_TAG_MAX_EXPORT_SIZE });
}

export async function getJobPublicData({ pageNum = null, pageSize = null, startDatetime = null, endDatetime = null, connection = null } = {}) {
  const searchParam = new SearchJobBO();
  searchParam.pageNum = pageNum;
  searchParam.pageSize = pageSize;
  searchParam.startDatetimeForUpdate = startDatetime;
  searchParam.endDatetimeForUpdate = endDatetime;
  searchParam.orderByColumn = "updateDatetime";
  searchParam.orderBy = "DESC";
  return searchByChunk({ param: searchParam, connection, searchFunction: _searchJob, maxChunkCount: JOB_PUBLIC_MAX_EXPORT_SIZE });
}

export async function createRepoIfNotExists({ userName, repoName, isPrivate = true } = {}) {
  try {
    await GithubApi.getRepo(userName, repoName, { getTokenFunction: getToken, setTokenFunction: setToken, });
    infoLog(`[Task Data] repo ${repoName} exists`);
  } catch (e) {
    infoLog(`[Task Data] repo ${repoName} exists not exists`);
    infoLog(`[Task Data] create a new repo ${repoName}`);
    if (e == EXCEPTION.NOT_FOUND) {
      await GithubApi.newRepo(repoName, { isPrivate, getTokenFunction: getToken, setTokenFunction: setToken, });
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
