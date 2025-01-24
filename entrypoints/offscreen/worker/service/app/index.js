import {
    TASK_STATUS_ERROR,
    TASK_STATUS_FINISHED,
    TASK_STATUS_FINISHED_BUT_ERROR,
    TASK_STATUS_READY,
    TASK_STATUS_RUNNING
} from "@/common";
import { KEY_GITHUB_OAUTH_TOKEN, KEY_GITHUB_USER, TASK_STATUS_ERROR_MAX_RETRY_COUNT } from "@/common/config";
import { SearchTaskBO } from "@/common/data/bo/searchTaskBO";
import { Config } from "@/common/data/domain/config";
import { OauthDTO } from "@/common/data/dto/oauthDTO";
import { UserDTO } from "@/common/data/dto/userDTO";
import { debugLog, infoLog } from "@/common/log";
import dayjs from "dayjs";
import minMax from 'dayjs/plugin/minMax'; // ES 2015
import { _addOrUpdateConfig, _getConfigByKey } from "../configService";
import { _searchTask, _taskAddOrUpdate } from "../taskService";
import { scheduleClearFile } from "./file";
import { setup as setupDownloadHandle } from "./taskDownload";
import { setup as setupMergeHandle } from "./taskMerge";
import { setup as setupUploadHandle } from "./taskUpload";
dayjs.extend(minMax);

const TASK_HANDLE_MAP = new Map();
// Upload
setupUploadHandle(TASK_HANDLE_MAP);
// Download
setupDownloadHandle(TASK_HANDLE_MAP);
// Merge
setupMergeHandle(TASK_HANDLE_MAP);

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

export async function runScheduleTask() {
    infoLog("[TASK] [SCHEDULE] runScheduleTask")
    await scheduleClearFile();
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

export async function isLogin() {
    return (await getToken()) ? true : false;
}

export function getPathByDatetime({ datetime }) {
    return `/${dayjs(datetime).format("YYYY")}/${dayjs(datetime).format("MM-DD")}`;
}