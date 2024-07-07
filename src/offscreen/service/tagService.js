import { Message } from "../../common/api/message";
import { postSuccessMessage, postErrorMessage } from "../util";
import { getDb, getOne, getAll } from "../database";
import { convertEmptyStringToNull } from "../../common/utils";
import dayjs from "dayjs";
import { Tag } from "../../common/data/domain/tag";

export const TagService = {
    /**
     *
     * @param {Message} message
     * @param {string} param id
     *
     * @returns Tag
     */
    getTagById: async function (message, param) {
        try {
            postSuccessMessage(
                message,
                _getTagById(param) 
            );
        } catch (e) {
            postErrorMessage(message, "[worker] getTagById error : " + e.message);
        }
    },
    /**
     *
     * @param {Message} message
     * @param {} param 
     *
     * @returns Tag[]
     */
    getAllTag: async function (message, param) {
        try {
            postSuccessMessage(
                message,
                await getAll(SQL_SELECT, {}, new Tag())
            );
        } catch (e) {
            postErrorMessage(message, "[worker] getTagById error : " + e.message);
        }
    },
    /**
     *
     * @param {Message} message
     * @param {Tag} param
     */
    addOrUpdateTag: async function (message, param) {
        try {
            await _addOrUpdateTag(param);
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] addOrUpdateTag error : " + e.message
            );
        }
    },

};

/**
 * 
 * @param {string} param id
 */
export async function _getTagById(param){
    return getOne(SQL_SELECT_BY_ID, [param], new Tag());
}

/**
 * 
 * @param {Tag} param 
 */
export async function _addOrUpdateTag(param) {
    const now = new Date();
    let rows = [];
    (await getDb()).exec({
        sql: SQL_SELECT_BY_ID,
        rowMode: "object",
        bind: [param.tagId],
        resultRows: rows,
    });
    if (rows.length > 0) {
        (await getDb()).exec({
            sql: SQL_UPDATE,
            bind: {
                $tag_id: convertEmptyStringToNull(param.tagId),
                $tag_name: convertEmptyStringToNull(param.tagName),
                $update_datetime: dayjs(now).format("YYYY-MM-DD HH:mm:ss"),
            },
        });
    } else {
        (await getDb()).exec({
            sql: SQL_INSERT,
            bind: {
                $tag_id: convertEmptyStringToNull(param.tagId),
                $tag_name: convertEmptyStringToNull(param.tagName),
                $create_datetime: dayjs(now).format("YYYY-MM-DD HH:mm:ss"),
                $update_datetime: dayjs(now).format("YYYY-MM-DD HH:mm:ss"),
            },
        });
    }
}

const SQL_SELECT = `SELECT tag_id, tag_name, create_datetime, update_datetime FROM tag`;
const SQL_SELECT_BY_ID = `${SQL_SELECT} WHERE tag_id = ?`;
const SQL_INSERT = `
INSERT INTO tag (tag_id, tag_name, create_datetime, update_datetime) VALUES ($tag_id,$tag_name,$create_datetime,$update_datetime)
`;
const SQL_UPDATE = `
UPDATE tag SET tag_name=$tag_name,update_datetime=$update_datetime WHERE tag_id = $tag_id;
`;