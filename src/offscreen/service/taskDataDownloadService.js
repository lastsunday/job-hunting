import { Message } from "../../common/api/message";
import { SearchTaskDataDownloadBO } from "../../common/data/bo/searchTaskDataDownloadBO";
import { SearchTaskDataDownloadDTO } from "../../common/data/dto/searchTaskDataDownloadDTO";
import { TaskDataDownload } from "../../common/data/domain/taskDataDownload";
import { BaseService } from "./baseService";
import { dateToStr } from "../../common/utils";

const SERVICE_INSTANCE = new BaseService("task_data_download", "id",
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
        SERVICE_INSTANCE.search(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {string} param id
     */
    taskDataDownloadGetById: async function (message, param) {
        SERVICE_INSTANCE.getById(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {TaskDataDownload} param
     */
    taskDataDownloadAddOrUpdate: async function (message, param) {
        param.datetime = dateToStr(param.datetime);
        SERVICE_INSTANCE.addOrUpdate(message, param);
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
