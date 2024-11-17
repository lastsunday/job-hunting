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

export async function _searchWithTagInfo({ param, cerateResultDTOFunction, createResultItemDTOFunction, genSqlSearchQueryFunction, genSearchWhereConditionSqlFunction, getAllDTOByIdsFunction, idColumn }) {
    let result = cerateResultDTOFunction();
    let sqlQuery = "";
    let whereCondition = genSearchWhereConditionSqlFunction();
    let orderBy =
        " ORDER BY " +
        param.orderByColumn +
        " " +
        param.orderBy +
        " NULLS LAST";
    let limitStart = (param.pageNum - 1) * param.pageSize;
    let limitEnd = param.pageSize;
    let limit = " limit " + limitStart + "," + limitEnd;
    const sqlSearchQuery = genSqlSearchQueryFunction();
    sqlQuery += sqlSearchQuery;
    sqlQuery += whereCondition;
    sqlQuery += orderBy;
    sqlQuery += limit;
    let items = [];
    let total = 0;
    let queryRows = [];
    (await getDb()).exec({
        sql: sqlQuery,
        rowMode: "object",
        resultRows: queryRows,
    });
    for (let i = 0; i < queryRows.length; i++) {
        let item = queryRows[i];
        let resultItem = createResultItemDTOFunction();
        let keys = Object.keys(item);
        for (let n = 0; n < keys.length; n++) {
            let key = keys[n];
            resultItem[key] = item[key];
        }
        item.tagNameArray = [];
        item.tagIdArray = [];
        items.push(item);
    }
    let ids = [];
    let itemIdObjectMap = new Map();
    if (items.length > 0) {
        items.forEach(item => {
            ids.push(item[idColumn]);
            itemIdObjectMap.set(item[idColumn], item);
        });
        let tagDTOList = await getAllDTOByIdsFunction(ids);
        tagDTOList.forEach(item => {
            itemIdObjectMap.get(item[idColumn]).tagNameArray.push(item.tagName);
            itemIdObjectMap.get(item[idColumn]).tagIdArray.push(item.tagId);
        });
    }
    let sqlCountSubTable = "";
    sqlCountSubTable += sqlSearchQuery;
    sqlCountSubTable += whereCondition;
    //count
    let sqlCount = `SELECT COUNT(*) AS total FROM (${sqlCountSubTable}) AS t1`;
    let queryCountRows = [];
    (await getDb()).exec({
        sql: sqlCount,
        rowMode: "object",
        resultRows: queryCountRows,
    });
    total = queryCountRows[0].total;
    result.items = items;
    result.total = total;
    return result;
}