import {
  DATA_TYPE_NAME_COMPANY,
  DATA_TYPE_NAME_COMPANY_TAG,
  DATA_TYPE_NAME_JOB,
  DATA_TYPE_NAME_JOB_PUBLIC,
  DATA_TYPE_NAME_JOB_TAG,
  isDataSourceDataDownloadType,
  isDataSourceDataMergeType,
  isStandardDataDownloadType,
  isStandardDataMergeType,
  TASK_STATUS_CANCEL,
  TASK_TYPE_COMPANY_COMMENT_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_COMMENT_DATA_MERGE,
  TASK_TYPE_COMPANY_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_DATA_MERGE,
  TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_TAG_DATA_MERGE,
  TASK_TYPE_JOB_DATA_DOWNLOAD,
  TASK_TYPE_JOB_DATA_MERGE,
  TASK_TYPE_JOB_PUBLIC_DATA_DOWNLOAD,
  TASK_TYPE_JOB_PUBLIC_DATA_MERGE,
  TASK_TYPE_JOB_TAG_DATA_DOWNLOAD,
  TASK_TYPE_JOB_TAG_DATA_MERGE,
  TASK_TYPE_METADATA_DATA_DOWNLOAD,
  TASK_TYPE_METADATA_DATA_MERGE
} from "@/common";
import { EXCEPTION } from "@/common/api/github";
import { TASK_DATA_DOWNLOAD_MAX_DAY } from "@/common/config";
import { SearchTaskDataDownloadBO } from "@/common/data/bo/searchTaskDataDownloadBO";
import { File } from "@/common/data/domain/file";
import { debugLog, errorLog, infoLog } from "@/common/log";
import { dateToStr } from "@/common/utils";
import { bytesToBase64 } from "@/common/utils/base64";
import { parse } from "@/common/utils/date";
import { shasum } from "@/common/utils/shasum";
import dayjs from "dayjs";
import { _queryLatestTaskDataDownload, _searchTaskDataDownload, _taskDataDownloadGetById } from "../taskDataDownloadService";
import { _updateTaskStatus } from "../taskService";
import { getPathByDatetime } from "./index";
import { saveFileAndCalculateDataMergeTask, saveTask } from "./taskDownloadLogic";
import { filterAndSortAscDateList, getFileData, getFileDataByUrl, queryRepoFileDateList } from "./taskLogic";
// Calculate
export async function calculateDownloadTask({ userName, repoName, taskType, typeId, config, getTargetDay = async () => {
  return dayjs();
} }) {
  const targetDay = await getTargetDay();
  if (isStandardDataDownloadType(taskType)) {
    return await handleStandardDataCalcalate({ userName, repoName, taskType, targetDay });
  } else if (isDataSourceDataDownloadType(taskType)) {
    return await handleStandardDataCalcalate({ userName, repoName, taskType, targetDay, config });
  } else if (taskType == TASK_TYPE_METADATA_DATA_DOWNLOAD) {
    return await handleDataCalcalate({ taskType, targetDay, typeId, config });
  } else {
    throw `unsupport download task taskType = ${taskType}`
  }
}

export async function handleStandardDataCalcalate({ userName, repoName, taskType, targetDay, config } = {}) {
  const typeId = config?.name;
  const fileName = config?.fileName;
  const retentionDay = config?.retentionDay;
  let repoAllFileDateList = [];
  try {
    repoAllFileDateList = await queryRepoFileDateList({ userName, repoName, taskType, fileName });
  } catch (e) {
    if (e == EXCEPTION.UNAUTHORIZED) {
      infoLog(`[TASK DATA DOWNLOAD CALCULATE] repo(${userName}/${repoName}) taskType = ${taskType},${fileName ? `fileName = ${fileName}` : ""} not found or unauthorized `);
    } else {
      throw e;
    }
    return false;
  }
  const repoFilterAndSortAscDateList = filterAndSortAscDateList({ dateList: repoAllFileDateList, targetDay, retentionDay: retentionDay ?? TASK_DATA_DOWNLOAD_MAX_DAY });
  //查找缺失的日期
  //获得数据库区间时间范围的记录
  let endDatetimeForSearchTaskDownload = null;
  let startDatetimeForSearchTaskDownload = null;
  if (repoFilterAndSortAscDateList.length > 0) {
    endDatetimeForSearchTaskDownload = repoFilterAndSortAscDateList[repoFilterAndSortAscDateList.length - 1];
    startDatetimeForSearchTaskDownload = repoFilterAndSortAscDateList[0];
    let searchParam = new SearchTaskDataDownloadBO();
    searchParam.userName = userName;
    searchParam.repoName = repoName;
    searchParam.type = taskType;
    searchParam.typeId = typeId;
    searchParam.startDatetime = startDatetimeForSearchTaskDownload;
    searchParam.endDatetime = endDatetimeForSearchTaskDownload.add(1, "day");
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
    let filterDay = repoFilterAndSortAscDateList.filter(item => { return !taskDataDownloadMap.has(dateToStr(item)) });
    infoLog(`[TASK DATA DOWNLOAD CALCULATE] filterDay length = ${filterDay.length} to add record`)
    //将缺失的日期任务添加到数据
    if (filterDay.length > 0) {
      try {
        await saveTask({ type: taskType, datetimeList: filterDay, userName, repoName, typeId, config })
        infoLog(`[TASK DATA DOWNLOAD CALCULATE] save task ${userName}/${repoName},${taskType},length = ${filterDay.length}`);
        return true;
      } catch (e) {
        errorLog(e);
      }
    } else {
      infoLog(`[TASK DATA DOWNLOAD CALCULATE] no newer record for ${userName}/${repoName}`);
    }
  } else {
    infoLog(`[TASK DATA DOWNLOAD CALCULATE] repo(${userName}/${repoName}) has't match record `);
  }
  return false;
}
export async function handleDataCalcalate({ taskType, targetDay, typeId, config } = {}) {
  const today = targetDay.startOf("day");
  const latestTaskDataDownload = await _queryLatestTaskDataDownload({
    param: {
      typeId,
      datetime: today,
    }
  });
  let needAdd = false;
  let needUpdateCancelStatusTaskId = [];
  if (latestTaskDataDownload.length == 0) {
    needAdd = true;
  } else {
    const latestItem = latestTaskDataDownload[0];
    if (today.isSame(latestItem.datetime)) {
      if (latestTaskDataDownload.length == 1) {
        //skip,the only item is today
      } else {
        needUpdateCancelStatusTaskId.push(...latestTaskDataDownload.slice(1, latestTaskDataDownload.length).map(item => item.id));
      }
    } else {
      needAdd = true;
      needUpdateCancelStatusTaskId.push(...latestTaskDataDownload.slice(0, latestTaskDataDownload.length).map(item => item.id));
    }
  }
  if (needUpdateCancelStatusTaskId.length > 0) {
    await _updateTaskStatus({ param: { id: needUpdateCancelStatusTaskId, status: TASK_STATUS_CANCEL } })
    infoLog(`[TASK DATA DOWNLOAD CALCULATE] update task status for cancel taskType = ${taskType},typeId = ${typeId},task ids = ${needUpdateCancelStatusTaskId}`);
  }
  if (needAdd) {
    await saveTask({ type: taskType, datetimeList: [today], typeId, config });
    infoLog(`[TASK DATA DOWNLOAD CALCULATE] save task taskType = ${taskType},typeId = ${typeId}, datetime = ${today}`);
  }
  const result = needUpdateCancelStatusTaskId.length > 0 || needAdd;
  if (!result) {
    infoLog(`[TASK DATA DOWNLOAD CALCULATE] sikp task taskType = ${taskType},typeId = ${typeId}, datetime = ${today}`);
  }
  return result;
}

// Handle
export function setup(handleMap) {
  handleMap.set(TASK_TYPE_JOB_DATA_DOWNLOAD, async (dataId) => {
    return downloadDataByDataId(dataId, DATA_TYPE_NAME_JOB, TASK_TYPE_JOB_DATA_MERGE);
  })
  handleMap.set(TASK_TYPE_COMPANY_DATA_DOWNLOAD, async (dataId) => {
    return downloadDataByDataId(dataId, DATA_TYPE_NAME_COMPANY, TASK_TYPE_COMPANY_DATA_MERGE);
  })
  handleMap.set(TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD, async (dataId) => {
    return downloadDataByDataId(dataId, DATA_TYPE_NAME_COMPANY_TAG, TASK_TYPE_COMPANY_TAG_DATA_MERGE);
  })
  handleMap.set(TASK_TYPE_JOB_TAG_DATA_DOWNLOAD, async (dataId) => {
    return downloadDataByDataId(dataId, DATA_TYPE_NAME_JOB_TAG, TASK_TYPE_JOB_TAG_DATA_MERGE);
  })
  handleMap.set(TASK_TYPE_JOB_PUBLIC_DATA_DOWNLOAD, async (dataId) => {
    return downloadDataByDataId(dataId, DATA_TYPE_NAME_JOB_PUBLIC, TASK_TYPE_JOB_PUBLIC_DATA_MERGE);
  })
  handleMap.set(TASK_TYPE_METADATA_DATA_DOWNLOAD, async (dataId) => {
    return downloadDataByDataId(dataId, null, TASK_TYPE_METADATA_DATA_MERGE);
  })
  handleMap.set(TASK_TYPE_COMPANY_COMMENT_DATA_DOWNLOAD, async (dataId) => {
    return downloadDataByDataId(dataId, null, TASK_TYPE_COMPANY_COMMENT_DATA_MERGE);
  })
}

export async function downloadDataByDataId(dataId, dataTypeName, taskType, { getTargetDay = async () => {
  return dayjs();
} } = {}) {
  const targetDay = await getTargetDay();
  if (isStandardDataMergeType(taskType)) {
    return await handleDownloadStandardDataByDataId(dataId, dataTypeName, taskType, { targetDay });
  } else if (isDataSourceDataMergeType(taskType)) {
    return await handleDownloadStandardDataByDataId(dataId, null, taskType, { targetDay });
  } else {
    return await handleDownloadDataByDataId(dataId, taskType);
  }
}

export async function handleDownloadDataByDataId(dataId, taskType) {
  let taskData = await _taskDataDownloadGetById({ param: dataId });
  const datetime = taskData.datetime;
  const typeId = taskData.typeId;
  const config = taskData?.config?.config;
  const url = config?.url;
  const filePath = config?.filePath;
  if (url && filePath) {
    try {
      infoLog(`[TASK DOWNLOAD DATA] get file from ${url}/${filePath}`);
      const fileData = await getFileDataByUrl({ url, filePath });
      const file = new File();
      file.name = filePath;
      file.sha = await shasum(fileData);
      file.encoding = "base64"
      file.content = bytesToBase64(fileData);
      file.size = fileData.byteLength;
      file.type = "file";
      await saveFileAndCalculateDataMergeTask({ taskType, file, datetime, typeId });
      return null;
    } catch (e) {
      if (e == EXCEPTION.NOT_FOUND) {
        debugLog(`[TASK DOWNLOAD DATA] file not exists ${url}/${filePath}`)
        return `file not exists ${url}/${filePath}`;
      } else {
        throw e;
      }
    }
  } else {
    throw "config url or path not exists";
  }
}

export async function handleDownloadStandardDataByDataId(dataId, dataTypeName, taskType, { targetDay } = {}) {
  let taskData = await _taskDataDownloadGetById({ param: dataId });
  let userName = taskData.username;
  let repoName = taskData.reponame;
  let datetime = taskData.datetime;
  const config = taskData.config;
  const actualFileName = dataTypeName ?? config?.fileName;
  infoLog(`[TASK DOWNLOAD DATA] file name = ${actualFileName}`);
  if (!actualFileName) {
    throw `can't find fileName,dataId = ${dataId}, taskType = ${taskType}`;
  }
  const path = getPathByDatetime({ datetime }) + `/${actualFileName}.zip`;
  try {
    try {
      infoLog(`[TASK DOWNLOAD DATA] get file from ${userName}.${repoName}.${path}`);
      const fileData = await getFileData({ userName, repoName, filePath: path });
      const file = new File();
      file.name = `${actualFileName}.zip`;
      file.sha = await shasum(fileData);
      file.encoding = "base64"
      file.content = bytesToBase64(fileData);
      file.size = fileData.byteLength;
      file.type = "file";
      await saveFileAndCalculateDataMergeTask({ userName, repoName, taskType, file, datetime, config });
      return null;
    } catch (e) {
      throw e;
    }
  } catch (e) {
    if (e == EXCEPTION.NOT_FOUND) {
      debugLog(`[TASK DOWNLOAD DATA]file not exists ${userName}.${repoName}.${path}`)
      //文件不存在
      //判断文件日期距离今日零点是否已超过一天
      //如果超过，则将通过任务
      //如果未超过则报错，使得其可以继续查询
      const ONE_DAY_OFFSET = 86400000;
      let now = targetDay;
      const fileDatetime = parse(datetime)
      const offset = now.valueOf() - fileDatetime.valueOf();
      if (offset >= ONE_DAY_OFFSET) {
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
