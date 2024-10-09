import { Message } from "../../common/api/message";
import { SearchTaskBO } from "../../common/data/bo/searchTaskBO";
import { SearchTaskDTO } from "../../common/data/dto/searchTaskDTO";
import { Task } from "../../common/data/domain/task";
import { BaseService } from "./baseService";
import dayjs from "dayjs";
import { TaskDTO } from "../../common/data/dto/taskDTO";
import {
    TASK_TYPE_COMPANY_DATA_DOWNLOAD, TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD, TASK_TYPE_JOB_DATA_DOWNLOAD,
    TASK_TYPE_JOB_DATA_UPLOAD, TASK_TYPE_COMPANY_DATA_UPLOAD, TASK_TYPE_COMPANY_TAG_DATA_UPLOAD,
    TASK_TYPE_JOB_DATA_MERGE, TASK_TYPE_COMPANY_DATA_MERGE, TASK_TYPE_COMPANY_TAG_DATA_MERGE
} from "../../common";
import { SERVICE_INSTANCE as taskDataDownloadService } from "./taskDataDownloadService";
import { SERVICE_INSTANCE as taskDataUploadService } from "./taskDataUploadService";
import { SERVICE_INSTANCE as taskDataMergeService } from "./taskDataMergeService";

const SERVICE_INSTANCE = new BaseService("task", "id",
    () => {
        return new Task();
    },
    () => {
        return new SearchTaskDTO();
    },
    (param) => {
        let whereCondition = "";
        if (param.typeList && param.typeList.length > 0) {
            let arraySplitString = "'" + param.typeList.join("','") + "'";
            whereCondition +=
                ` AND type IN (${arraySplitString})`;
        }
        if (param.statusList && param.statusList.length > 0) {
            let arraySplitString = "'" + param.statusList.join("','") + "'";
            whereCondition +=
                ` AND status IN (${arraySplitString})`;
        }
        if (param.endRetryCount) {
            whereCondition += ` AND retry_count < ${param.endRetryCount}`;
        }
        if (param.startDatetimeForCreate) {
            whereCondition +=
                " AND create_datetime >= '" +
                dayjs(param.startDatetimeForCreate).format("YYYY-MM-DD HH:mm:ss") +
                "'";
        }
        if (param.endDatetimeForCreate) {
            whereCondition +=
                " AND create_datetime < '" +
                dayjs(param.endDatetimeForCreate).format("YYYY-MM-DD HH:mm:ss") +
                "'";
        }
        if (param.startDatetimeForUpdate) {
            whereCondition +=
                " AND update_datetime >= '" +
                dayjs(param.startDatetimeForUpdate).format("YYYY-MM-DD HH:mm:ss") +
                "'";
        }
        if (param.endDatetimeForUpdate) {
            whereCondition +=
                " AND update_datetime < '" +
                dayjs(param.endDatetimeForUpdate).format("YYYY-MM-DD HH:mm:ss") +
                "'";
        }
        return whereCondition;
    }
);

function createTypeAndObjectListMap(items) {
    let map = new Map();
    for (let i = 0; i < items.length; i++) {
        let item = items[i];
        let type = item.type;
        if (!map.has(type)) {
            map.set(type, []);
        }
        map.get(type).push(item);
    }
    return map;
}

async function getDetailObjectList(typeAndObjectListMap) {
    let result = [];
    let typeList = Array.from(typeAndObjectListMap.keys());
    for (let i = 0; i < typeList.length; i++) {
        let type = typeList[i];
        let ids = typeAndObjectListMap.get(type).flatMap(item => item.dataId);
        if (isDownloadType(type)) {
            let items = await taskDataDownloadService._getByIds(ids);
            result.push(...items);
        } else if (isUploadType(type)) {
            let items = await taskDataUploadService._getByIds(ids);
            result.push(...items);
        } else if (isMergeType(type)) {
            let items = await taskDataMergeService._getByIds(ids);
            result.push(...items);
        } else {
            //skip
        }
    }
    return result;
}

function isDownloadType(type) {
    return type == TASK_TYPE_JOB_DATA_DOWNLOAD || type == TASK_TYPE_COMPANY_DATA_DOWNLOAD || type == TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD;
}

function isUploadType(type) {
    return type == TASK_TYPE_JOB_DATA_UPLOAD || type == TASK_TYPE_COMPANY_DATA_UPLOAD || type == TASK_TYPE_COMPANY_TAG_DATA_UPLOAD;
}

function isMergeType(type) {
    return type == TASK_TYPE_JOB_DATA_MERGE || type == TASK_TYPE_COMPANY_DATA_MERGE || type == TASK_TYPE_COMPANY_TAG_DATA_MERGE;
}

export const TaskService = {
    /**
     * 
     * @param {Message} message 
     * @param {SearchTaskBO} param 
     * 
     * @returns SearchTaskDTO
     */
    searchTask: async function (message, param) {
        SERVICE_INSTANCE.search(message, param);
    },
    /**
     * 
     * @param {Message} message 
     * @param {SearchTaskBO} param 
     * 
     * @returns SearchTaskDTO
     */
    searchTaskWithDetail: async function (message, param) {
        SERVICE_INSTANCE.search(message, param, {
            detailInjectAsyncCallback: async (result) => {
                let targetItemList = [];
                let items = result.items;
                let typeAndObjectListMap = createTypeAndObjectListMap(items);
                let detailObjectList = await getDetailObjectList(typeAndObjectListMap);
                let dataIdAndDetailObjectMap = new Map();
                for (let i = 0; i < detailObjectList.length; i++) {
                    let item = detailObjectList[i];
                    dataIdAndDetailObjectMap.set(item.id, item);
                }
                for (let i = 0; i < items.length; i++) {
                    let targetItem = Object.assign(new TaskDTO(), items[i]);
                    targetItem.detail = dataIdAndDetailObjectMap.get(targetItem.dataId);
                    targetItemList.push(targetItem);
                }
                result.items = targetItemList;
                return result;
            }
        });
    },
    /**
     *
     * @param {Message} message
     * @param {Task} param
     */
    taskAddOrUpdate: async function (message, param) {
        SERVICE_INSTANCE.addOrUpdate(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {string} param id
     */
    taskDeleteById: async function (message, param) {
        SERVICE_INSTANCE.deleteById(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {string[]} param ids
     */
    taskDeleteByIds: async function (message, param) {
        SERVICE_INSTANCE.deleteByIds(message, param);
    },
};
