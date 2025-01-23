import { Message } from "@/common/api/message";
import { SearchTaskDataDownloadBO } from "@/common/data/bo/searchTaskDataDownloadBO";
import { TaskDataDownload } from "@/common/data/domain/taskDataDownload";
import { SearchTaskDataDownloadDTO } from "@/common/data/dto/searchTaskDataDownloadDTO";
import { postSuccessMessage } from "@/common/extension/worker/util";
import { dateToStr } from "@/common/utils";
import dayjs from "dayjs";
import { BaseService } from "./baseService";

export const SERVICE_INSTANCE = new BaseService("task_data_download", "id",
    () => {
        return new TaskDataDownload();
    },
    () => {
        return new SearchTaskDataDownloadDTO();
    },
    (param) => {
        let whereCondition = "";
        if (param.userName) {
            whereCondition +=
                " AND username = '" +
                param.userName +
                "'";
        }
        if (param.repoName) {
            whereCondition +=
                " AND reponame = '" +
                param.repoName +
                "'";
        }
        if (param.startDatetime) {
            whereCondition +=
                " AND datetime >= '" +
                dateToStr(param.startDatetime) +
                "'";
        }
        if (param.endDatetime) {
            whereCondition +=
                " AND datetime < '" +
                dateToStr(param.endDatetime) +
                "'";
        }
        return whereCondition;
    }
);

export const TaskDataDownloadService = {
    /**
     * 
     * @param {Message} message 
     * @param {SearchTaskDataDownloadBO} param 
     * 
     * @returns SearchTaskDataDownloadDTO
     */
    searchTaskDataDownload: async function (message, param) {
        try {
            postSuccessMessage(message, await _searchTaskDataDownload({ param }));
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] searchTaskDataDownload error : " + e.message
            );
        }
    },
    /**
     *
     * @param {Message} message
     * @param {string} param id
     */
    taskDataDownloadGetById: async function (message, param) {
        try {
            postSuccessMessage(message, await _taskDataDownloadGetById({ param }));
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] taskDataDownloadGetById error : " + e.message
            );
        }
    },
    /**
     *
     * @param {Message} message
     * @param {TaskDataDownload} param
     */
    taskDataDownloadAddOrUpdate: async function (message, param) {
        try {
            postSuccessMessage(message, await _taskDataDownloadAddOrUpdate({ param }));
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] taskDataDownloadAddOrUpdate error : " + e.message
            );
        }
    },
    /**
     *
     * @param {Message} message
     * @param {string} param id
     */
    taskDataDownloadDeleteById: async function (message, param) {
        SERVICE_INSTANCE.deleteById(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {string[]} param ids
     */
    taskDataDownloadDeleteByIds: async function (message, param) {
        SERVICE_INSTANCE.deleteByIds(message, param);
    }

};

export const _taskDataDownloadGetById = async ({ param = null, connection = null } = {}) => {
    return await SERVICE_INSTANCE._getById(param, { connection });
}

export const _taskDataDownloadAddOrUpdate = async ({ param = null, connection = null } = {}) => {
    param.datetime = dayjs(param.datetime).format();
    return await SERVICE_INSTANCE._addOrUpdate(param, { connection });;
}

export const _searchTaskDataDownload = async ({ param = null, connection = null } = {}) => {
    return await SERVICE_INSTANCE._search(param, { connection });
}