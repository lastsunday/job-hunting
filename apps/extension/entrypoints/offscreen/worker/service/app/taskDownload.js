import {
  DATA_TYPE_NAME_COMPANY,
  DATA_TYPE_NAME_COMPANY_TAG,
  DATA_TYPE_NAME_JOB,
  DATA_TYPE_NAME_JOB_PUBLIC,
  DATA_TYPE_NAME_JOB_TAG,
  isStandardDataDownloadType,
  TASK_STATUS_CANCEL,
  TASK_TYPE_COMPANY_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_DATA_MERGE,
  TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_TAG_DATA_MERGE,
  TASK_TYPE_JOB_DATA_DOWNLOAD,
  TASK_TYPE_JOB_DATA_MERGE,
  TASK_TYPE_JOB_PUBLIC_DATA_DOWNLOAD,
  TASK_TYPE_JOB_PUBLIC_DATA_MERGE,
  TASK_TYPE_JOB_TAG_DATA_DOWNLOAD,
  TASK_TYPE_JOB_TAG_DATA_MERGE
} from "@/common";
import { EXCEPTION } from "@/common/api/github";
import { TASK_DATA_DOWNLOAD_MAX_DAY } from "@/common/config";
import { SearchTaskDataDownloadBO } from "@/common/data/bo/searchTaskDataDownloadBO";
import { File } from "@/common/data/domain/file";
import { debugLog, errorLog, infoLog } from "@/common/log";
import { dateToStr } from "@/common/utils";
import { bytesToBase64 } from "@/common/utils/base64";
import { parse } from "@/common/utils/date";
import dayjs from "dayjs";
import { _queryLatestTaskDataDownload, _searchTaskDataDownload, _taskDataDownloadGetById } from "../taskDataDownloadService";
import { getPathByDatetime, isLogin } from "./index";
import { saveFileAndCalculateDataMergeTask, saveTask } from "./taskDownloadLogic";
import { filterAndSortAscDateList, getFileData, queryRepoFileDateList } from "./taskLogic";
import { shasum } from "@/common/utils/shasum";
import { _updateTaskStatus } from "../taskService";
// Calculate
export async function calculateDownloadTask({ userName, repoName, taskType, typeId, config, getTargetDay = async () => {
  return dayjs();
} }) {
  const targetDay = await getTargetDay();
  if (isStandardDataDownloadType(taskType)) {
    return await handleStandardDataCalcalate({ userName, repoName, taskType, targetDay });
  } else {
    return await handleDataCalcalate({ taskType, targetDay, typeId, config });
  }
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
        needUpdateCancelStatusTaskId.push(latestTaskDataDownload.slice(1, latestTaskDataDownload.length).map(item => item.id));
      }
    } else {
      needAdd = true;
      needUpdateCancelStatusTaskId.push(latestTaskDataDownload.slice(0, latestTaskDataDownload.length).map(item => item.id));
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

export async function handleStandardDataCalcalate({ userName, repoName, taskType, targetDay } = {}) {
  let repoAllFileDateList = [];
  try {
    repoAllFileDateList = await queryRepoFileDateList({ userName, repoName, taskType });
  } catch (e) {
    if (e == EXCEPTION.UNAUTHORIZED) {
      infoLog(`[TASK DATA DOWNLOAD CALCULATE] repo(${userName}/${repoName}) taskType = ${taskType} not found or unauthorized `);
    } else {
      throw e;
    }
    return false;
  }
  const repoFilterAndSortAscDateList = filterAndSortAscDateList({ dateList: repoAllFileDateList, targetDay, retentionDay: TASK_DATA_DOWNLOAD_MAX_DAY });
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
        await saveTask({ type: taskType, datetimeList: filterDay, userName, repoName })
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
}

export async function downloadDataByDataId(dataId, dataTypeName, taskType, { getTargetDay = async () => {
  return dayjs();
} } = {}) {
  if (!(await isLogin())) {
    infoLog(`[TASK HANDLE]No login info, skip run task dataId = ${dataId}, dataTypeName = ${dataTypeName}`)
    throw EXCEPTION.NO_LOGIN;
  }
  let taskData = await _taskDataDownloadGetById({ param: dataId });
  let userName = taskData.username;
  let repoName = taskData.reponame;
  let datetime = taskData.datetime;
  const path = getPathByDatetime({ datetime }) + `/${dataTypeName}.zip`;
  try {
    try {
      infoLog(`[TASK DOWNLOAD DATA] get file from ${userName}.${repoName}.${path}`);
      const fileData = await getFileData({ userName, repoName, filePath: path });
      const file = new File();
      file.name = `${dataTypeName}.zip`;
      file.sha = await shasum(fileData);
      file.encoding = "base64"
      file.content = bytesToBase64(fileData);
      file.size = fileData.byteLength;
      file.type = "file";
      await saveFileAndCalculateDataMergeTask({ userName, repoName, taskType, file, datetime });
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
      let now = await getTargetDay();
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
