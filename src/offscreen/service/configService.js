import { Message } from "../../common/api/message";
import { postSuccessMessage, postErrorMessage } from "../util";
import { getDb, getOne, getAll } from "../database";
import { Config } from "../../common/data/domain/config";
import { convertEmptyStringToNull } from "../../common/utils";
import dayjs from "dayjs";

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
export async function _getConfigByKey(param) {
    return getOne(SQL_SELECT_BY_KEY, [param], new Config());
}

/**
 * 
 * @param {Tag} param 
 */
export async function _addOrUpdateConfig(param) {
    const now = new Date();
    let rows = [];
    (await getDb()).exec({
        sql: SQL_SELECT_BY_KEY,
        rowMode: "object",
        bind: [param.key],
        resultRows: rows,
    });
    if (rows.length > 0) {
        (await getDb()).exec({
            sql: SQL_UPDATE,
            bind: {
                $key: convertEmptyStringToNull(param.key),
                $value: convertEmptyStringToNull(param.value),
                $update_datetime: dayjs(now).format("YYYY-MM-DD HH:mm:ss"),
            },
        });
    } else {
        (await getDb()).exec({
            sql: SQL_INSERT,
            bind: {
                $key: convertEmptyStringToNull(param.key),
                $value: convertEmptyStringToNull(param.value),
                $create_datetime: dayjs(now).format("YYYY-MM-DD HH:mm:ss"),
                $update_datetime: dayjs(now).format("YYYY-MM-DD HH:mm:ss"),
            },
        });
    }
}

const SQL_SELECT = `SELECT key,value,create_datetime, update_datetime FROM config`;
const SQL_SELECT_BY_KEY = `${SQL_SELECT} WHERE key = ?`;
const SQL_INSERT = `
INSERT INTO config (key, value, create_datetime, update_datetime) VALUES ($key,$value,$create_datetime,$update_datetime)
`;
const SQL_UPDATE = `
UPDATE config SET key=$key,update_datetime=$update_datetime WHERE value = $value;
`;