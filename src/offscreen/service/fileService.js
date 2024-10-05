import { Message } from "../../common/api/message";
import { SearchFileBO } from "../../common/data/bo/searchFileBO";
import { SearchFileDTO } from "../../common/data/dto/searchFileDTO";
import { File } from "../../common/data/domain/file";
import { BaseService } from "./baseService";

const SERVICE_INSTANCE = new BaseService("file", "id",
    () => {
        return new File();
    },
    () => {
        return new SearchFileDTO();
    },
    null
);

export const FileService = {
    /**
     * 
     * @param {Message} message 
     * @param {SearchFileBO} param 
     * 
     * @returns SearchFileDTO
     */
    searchFile: async function (message, param) {
        SERVICE_INSTANCE.search(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {string} param id
     */
    fileGetById: async function (message, param) {
        SERVICE_INSTANCE.getById(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {File} param
     */
    fileAddOrUpdate: async function (message, param) {
        SERVICE_INSTANCE.addOrUpdate(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {string} param id
     */
    fileDeleteById: async function (message, param) {
        SERVICE_INSTANCE.deleteById(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {string[]} param ids
     */
    fileDeleteByIds: async function (message, param) {
        SERVICE_INSTANCE.deleteByIds(message, param);
    }

};
