import { Message } from "@/common/api/message";
import { SearchTaskDataUploadBO } from "@/common/data/bo/searchTaskDataUploadBO";
import { TaskDataUpload } from "@/common/data/domain/taskDataUpload";
import { SearchTaskDataUploadDTO } from "@/common/data/dto/searchTaskDataUploadDTO";
import { postErrorMessage, postSuccessMessage } from "@/common/extension/worker/util";
import { dateToStr } from "@/common/utils/date";
import { getDb } from "../database";
import { BaseService } from "./baseService";
import { genWhereSql } from "./sqlUtil";

export const SERVICE_INSTANCE = new BaseService("task_data_upload", "id",
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
        try {
            postSuccessMessage(message, await _taskDataUploadGetById({ param }));
        } catch (e) {
            postErrorMessage(message, "[worker] taskDataUploadGetById error : " + e.message);
        }
    },
    /**
     *
     * @param {Message} message
     * @param {TaskDataUpload} param
     */
    taskDataUploadAddOrUpdate: async function (message, param) {
        try {
            postSuccessMessage(message, await _taskDataUploadAddOrUpdate({ param }));
        } catch (e) {
            postErrorMessage(message, "[worker] taskDataUploadAddOrUpdate error : " + e.message);
        }
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
            postSuccessMessage(message, await _taskDataUploadGetMaxEndDatetime());
        } catch (e) {
            postErrorMessage(message, "[worker] taskDataUploadGetMaxEndDatetime error : " + e.message);
        }
    },

};

export const _taskDataUploadGetById = async ({ param = null, connection = null } = {}) => {
    return await SERVICE_INSTANCE._getById(param, { connection });
}

export const _taskDataUploadAddOrUpdate = async ({ param = null, connection = null } = {}) => {
    param.startDatetime = dateToStr(param.startDatetime);
    param.endDatetime = dateToStr(param.endDatetime);
    return await SERVICE_INSTANCE._addOrUpdate(param, { connection });
}

export const _taskDataUploadGetMaxEndDatetime = async ({ connection = null, username = null, reponame = null, type = null } = {}) => {
    connection ??= await getDb();
    const whereCondition = genWhereSql([
        { include: username, sql: `AND username = '${username}'` },
        { include: reponame, sql: `AND reponame = '${reponame}'` },
        { include: type, sql: `AND type = '${type}'` }
    ]
    );
    const { rows } = await connection.query(`SELECT MAX(end_datetime) AS datetime FROM task_data_upload ${whereCondition}`);
    return rows[0].datetime;
}