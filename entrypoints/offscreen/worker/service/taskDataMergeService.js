import { Message } from "@/common/api/message";
import { SearchTaskDataMergeBO } from "@/common/data/bo/searchTaskDataMergeBO";
import { TaskDataMerge } from "@/common/data/domain/taskDataMerge";
import { SearchTaskDataMergeDTO } from "@/common/data/dto/searchTaskDataMergeDTO";
import dayjs from "dayjs";
import { BaseService } from "./baseService";

export const SERVICE_INSTANCE = new BaseService("task_data_merge", "id",
    () => {
        return new TaskDataMerge();
    },
    () => {
        return new SearchTaskDataMergeDTO();
    },
    null
);

export const TaskDataMergeService = {
    /**
     * 
     * @param {Message} message 
     * @param {SearchTaskDataMergeBO} param 
     * 
     * @returns SearchTaskDataMergeDTO
     */
    searchTaskDataMerge: async function (message, param) {
        SERVICE_INSTANCE.search(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {string} param id
     */
    taskDataMergeGetById: async function (message, param) {
        try {
            postSuccessMessage(message, await _taskDataMergeGetById({ param }));
        } catch (e) {
            postErrorMessage(message, "[worker] taskDataMergeGetById error : " + e.message);
        }
    },
    /**
     *
     * @param {Message} message
     * @param {TaskDataMerge} param
     */
    taskDataMergeAddOrUpdate: async function (message, param) {
        try {
            postSuccessMessage(message, await _taskDataMergeAddOrUpdate({ param }));
        } catch (e) {
            postErrorMessage(message, "[worker] taskDataMergeAddOrUpdate error : " + e.message);
        }
    },
    /**
     *
     * @param {Message} message
     * @param {string} param id
     */
    taskDataMergeDeleteById: async function (message, param) {
        SERVICE_INSTANCE.deleteById(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {string[]} param ids
     */
    taskDataMergeDeleteByIds: async function (message, param) {
        SERVICE_INSTANCE.deleteByIds(message, param);
    }
};

export const _taskDataMergeGetById = async ({ param = null, connection = null } = {}) => {
    return await SERVICE_INSTANCE._getById(param, { connection });
}

export const _taskDataMergeAddOrUpdate = async ({ param = null, connection = null } = {}) => {
    param.datetime = dayjs(param.datetime).format();
    return await SERVICE_INSTANCE._addOrUpdate(param, { connection });;
}