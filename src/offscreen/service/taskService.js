import { Message } from "../../common/api/message";
import { SearchTaskBO } from "../../common/data/bo/searchTaskBO";
import { SearchTaskDTO } from "../../common/data/dto/searchTaskDTO";
import { Task } from "../../common/data/domain/task";
import { BaseService } from "./baseService";

const SERVICE_INSTANCE = new BaseService("task", "id",
    () => {
        return new Task();
    },
    () => {
        return new SearchTaskDTO();
    },
    (param) => {
        let whereCondition = "";
        if (param.statusList) {
            let statusArraySplitString = "'" + param.statusList.join("','") + "'";
            whereCondition +=
                ` AND status IN (${statusArraySplitString})`;
        }
        if (param.endRetryCount) {
            whereCondition += ` AND retry_count < ${param.endRetryCount}`;
        }
        return whereCondition;
    }
);

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
