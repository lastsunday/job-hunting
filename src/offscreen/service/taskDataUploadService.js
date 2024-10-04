import { Message } from "../../common/api/message";
import { SearchTaskDataUploadBO } from "../../common/data/bo/searchTaskDataUploadBO";
import { SearchTaskDataUploadDTO } from "../../common/data/dto/searchTaskDataUploadDTO";
import { TaskDataUpload } from "../../common/data/domain/taskDataUpload";
import { BaseService } from "./baseService";
import { getDb } from "../database";
import { postSuccessMessage, postErrorMessage } from "../util";
import { dateToStr } from "../../common/utils";

const SERVICE_INSTANCE = new BaseService("task_data_upload", "id",
    () => {
        return new TaskDataUpload();
    },
    () => {
        return new SearchTaskDataUploadDTO();
    },
    null
);

export const TaskDataUploadService = {
    /**
     * 
     * @param {Message} message 
     * @param {SearchTaskDataUploadBO} param 
     * 
     * @returns SearchTaskDataUploadDTO
     */
    searchTaskDataUpload: async function (message, param) {
        SERVICE_INSTANCE.search(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {string} param id
     */
    taskDataUploadGetById: async function (message, param) {
        SERVICE_INSTANCE.getById(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {TaskDataUpload} param
     */
    taskDataUploadAddOrUpdate: async function (message, param) {
        param.startDatetime = dateToStr(param.startDatetime);
        param.endDatetime = dateToStr(param.endDatetime);
        SERVICE_INSTANCE.addOrUpdate(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {string} param id
     */
    taskDataUploadDeleteById: async function (message, param) {
        SERVICE_INSTANCE.deleteById(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {string[]} param ids
     */
    taskDataUploadDeleteByIds: async function (message, param) {
        SERVICE_INSTANCE.deleteByIds(message, param);
    },
    /**
     * 
     * @param {Message} message 
     * @param {} param 
     * 
     * @returns string
     */
    taskDataUploadGetMaxEndDatetime: async function (message, param) {
        try {
            const SQL =
                "SELECT MAX(end_datetime) AS maxDatetime FROM task_data_upload;";
            let result = [];
            (await getDb()).exec({
                sql: SQL,
                rowMode: "object",
                resultRows: result,
            });
            postSuccessMessage(message, result[0].maxDatetime);
        } catch (e) {
            postErrorMessage(message, "[worker] taskDataUploadGetMaxEndDatetime error : " + e.message);
        }

    },

};
