import { Message } from "@/common/api/message";
import { Config } from "@/common/data/domain/config";
import { postErrorMessage, postSuccessMessage } from "@/common/extension/worker/util";
import { convertEmptyStringToNull } from "@/common/utils";
import dayjs from "dayjs";
import { getAll, getDb, getOne } from "../database";

export const ConfigService = {
    /**
     *
     * @param {Message} message
     * @param {string} param key
     *
     * @returns Config
     */
    getConfigByKey: async function (message, param) {
        try {
            postSuccessMessage(
                message,
                await _getConfigByKey(param)
            );
        } catch (e) {
            postErrorMessage(message, "[worker] getConfigByKey error : " + e.message);
        }
    },
    /**
     *
     * @param {Message} message
     * @param {} param 
     *
     * @returns Config[]
     */
    getAllConfig: async function (message, param) {
        try {
            postSuccessMessage(
                message,
                await getAll(SQL_SELECT, {}, new Config())
            );
        } catch (e) {
            postErrorMessage(message, "[worker] getAllConfig error : " + e.message);
        }
    },
    /**
     *
     * @param {Message} message
     * @param {Config} param
     */
    addOrUpdateConfig: async function (message, param) {
        try {
            await _addOrUpdateConfig(param);
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] addOrUpdateConfig error : " + e.message
            );
        }
    },

};

/**
 * 
 * @param {string} param id
 */
export async function _getConfigByKey(param, { connection = null } = {}) {
    return getOne(SQL_SELECT_BY_KEY, [param], new Config(), { connection });
}

/**
 * 
 * @param {Config} param 
 */
export async function _addOrUpdateConfig(param) {
    const now = new Date();
    const { rows } = await (await getDb()).query(SQL_SELECT_BY_KEY, [param.key]);
    if (rows.length > 0) {
        await (await getDb()).query(SQL_UPDATE, [
            convertEmptyStringToNull(param.value),
            dayjs(now).format(),
            convertEmptyStringToNull(param.key)
        ]);
    } else {
        await (await getDb()).query(SQL_INSERT, [
            convertEmptyStringToNull(param.key),
            convertEmptyStringToNull(param.value),
            dayjs(now).format(),
            dayjs(now).format(),
        ]);
    }
}

const SQL_SELECT = `SELECT key,value,create_datetime, update_datetime FROM config`;
const SQL_SELECT_BY_KEY = `${SQL_SELECT} WHERE key = $1`;
const SQL_INSERT = `
INSERT INTO config (key, value, create_datetime, update_datetime) VALUES ($1,$2,$3,$4)
`;
const SQL_UPDATE = `
UPDATE config SET value=$1,update_datetime=$2 WHERE key = $3;
`;