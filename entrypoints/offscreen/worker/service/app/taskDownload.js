import {
    DATA_TYPE_NAME_COMPANY,
    DATA_TYPE_NAME_COMPANY_TAG,
    DATA_TYPE_NAME_JOB,
    DATA_TYPE_NAME_JOB_TAG,
    TASK_STATUS_READY,
    TASK_TYPE_COMPANY_DATA_DOWNLOAD,
    TASK_TYPE_COMPANY_DATA_MERGE,
    TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD,
    TASK_TYPE_COMPANY_TAG_DATA_MERGE,
    TASK_TYPE_JOB_DATA_DOWNLOAD,
    TASK_TYPE_JOB_DATA_MERGE,
    TASK_TYPE_JOB_TAG_DATA_DOWNLOAD,
    TASK_TYPE_JOB_TAG_DATA_MERGE
} from "@/common";
import { EXCEPTION, GithubApi } from "@/common/api/github";
import { TASK_DATA_DOWNLOAD_MAX_DAY } from "@/common/config";
import { SearchTaskDataDownloadBO } from "@/common/data/bo/searchTaskDataDownloadBO";
import { File } from "@/common/data/domain/file";
import { Task } from "@/common/data/domain/task";
import { TaskDataDownload } from "@/common/data/domain/taskDataDownload";
import { TaskDataMerge } from "@/common/data/domain/taskDataMerge";
import { debugLog, errorLog, infoLog } from "@/common/log";
import { dateToStr } from "@/common/utils";
import { bytesToBase64 } from "@/common/utils/base64";
import dayjs from "dayjs";
import minMax from 'dayjs/plugin/minMax'; // ES 2015
import { getDb } from "../../database";
import { _fileAddOrUpdate } from "../fileService";
import { _searchTaskDataDownload, _taskDataDownloadAddOrUpdate, _taskDataDownloadGetById } from "../taskDataDownloadService";
import { _taskDataMergeAddOrUpdate } from "../taskDataMergeService";
import { _taskAddOrUpdate } from "../taskService";
import { getPathByDatetime, getToken, isLogin, setToken } from "./index";
dayjs.extend(minMax);

// Calculate
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