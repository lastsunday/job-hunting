import { Message } from "../../common/api/message";
import { SearchTaskDataMergeBO } from "../../common/data/bo/searchTaskDataMergeBO";
import { SearchTaskDataMergeDTO } from "../../common/data/dto/searchTaskDataMergeDTO";
import { TaskDataMerge } from "../../common/data/domain/taskDataMerge";
import { BaseService } from "./baseService";
import { dateToStr } from "../../common/utils";

const SERVICE_INSTANCE = new BaseService("task_data_merge", "id",
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
        SERVICE_INSTANCE.getById(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {TaskDataMerge} param
     */
    taskDataMergeAddOrUpdate: async function (message, param) {
        param.datetime = dateToStr(param.datetime);
        SERVICE_INSTANCE.addOrUpdate(message, param);
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
