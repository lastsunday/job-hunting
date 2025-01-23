import { Message } from "@/common/api/message";
import { TagSearchBO } from "@/common/data/bo/tagSearchBO";
import { Tag } from "@/common/data/domain/tag";
import { TagSearchDTO } from "@/common/data/dto/tagSearchDTO";
import { postErrorMessage, postSuccessMessage } from "@/common/extension/worker/util";
import { genIdFromText, toHump, toLine } from "@/common/utils";
import { batchGet, getAll, getDb, getOne } from "../database";
import { BaseService } from "./baseService";

const SERVICE_INSTANCE = new BaseService("tag", "tag_id",
    () => {
        return new Tag();
    },
    () => {
        return new TagSearchDTO();
    },
    (param) => {
        let whereCondition = "";
        if (param.tagName) {
            whereCondition += " AND tag_name LIKE '%" + param.tagName + "%' ";
        }
        if (param.isPublic != null) {
            whereCondition += ` AND is_public = ${param.isPublic}`;
        }
        return whereCondition;
    }
);

export const TagService = {

    /**
     * 
     * @param {Message} message 
     * @param {TagSearchBO} param 
     * 
     * @returns TagSearchDTO
     */
    tagSearch: async function (message, param) {
        SERVICE_INSTANCE.search(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {string} param id
     */
    tagDeleteById: async function (message, param) {
        SERVICE_INSTANCE.deleteById(message, param);
    },
    /**
     *
     * @param {Message} message
     * @param {string[]} param ids
     */
    tagDeleteByIds: async function (message, param) {
        SERVICE_INSTANCE.deleteByIds(message, param);
    },
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
                await getAll(SQL_SELECT, [], new Tag())
            );
        } catch (e) {
            postErrorMessage(message, "[worker] getTagById error : " + e.message);
        }
    },
    tagGetByName: async function (message, param) {
        SERVICE_INSTANCE.getOne(message, param, "tag_name");
    },
    /**
     *
     * @param {Message} message
     * @param {Tag} param
     */
    addOrUpdateTag: async function (message, param) {
        try {
            await SERVICE_INSTANCE._addOrUpdate(param);
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
export async function _getTagById(param) {
    return getOne(SQL_SELECT_BY_ID, [param], new Tag());
}

/**
 * 
 * @param {string[]} ids 
 * @returns 
 */
export async function _batchGetTagByIds(ids, { connection = null } = {}) {
    return batchGet(new Tag(), "tag", "tag_id", ids, { connection })
}

/**
 * 
 * @param {string[]} tags 
 */
export async function _addNotExistsTags(tags, { connection = null } = {}) {
    //对tags进行去重处理
    const uniqueTags = Array.from(new Set(tags));
    const tagIds = [];
    for (let i = 0; i < uniqueTags.length; i++) {
        let tagName = uniqueTags[i];
        let id = genIdFromText(tagName);
        tagIds.push(id);
    }
    const existsTags = await _batchGetTagByIds(tagIds, { connection });
    const existsTagIds = existsTags.map(item => item.tagId);
    let targetTags = [];
    for (let i = 0; i < uniqueTags.length; i++) {
        let tagName = uniqueTags[i];
        let id = genIdFromText(tagName);
        if (!existsTagIds.includes(id)) {
            let tag = new Tag();
            tag.tagName = tagName;
            targetTags.push(tag);
        }
    }
    await SERVICE_INSTANCE._batchAddOrUpdate(targetTags, {
        connection,
        genIdFunction: (item) => {
            return genIdFromText(item.tagName);
        }
    });
}

const SQL_SELECT = `SELECT tag_id, tag_name, create_datetime, update_datetime,is_public FROM tag`;
const SQL_SELECT_BY_ID = `${SQL_SELECT} WHERE tag_id = $1`;

export async function _searchWithTagInfo({ param, cerateResultDTOFunction, createResultItemDTOFunction, genSqlSearchQueryFunction, genSearchWhereConditionSqlFunction, getAllDTOByIdsFunction, idColumn }) {
    let result = cerateResultDTOFunction();
    let sqlQuery = "";
    let whereCondition = genSearchWhereConditionSqlFunction();
    let orderBy = "";
    if (param.orderByColumn != null && param.orderBy != null) {
        orderBy =
            " ORDER BY " +
            toLine(param.orderByColumn) +
            " " +
            param.orderBy +
            " NULLS LAST";
    }
    let limit = '';
    if (param.pageNum != null && param.pageSize != null) {
        let limitStart = (param.pageNum - 1) * param.pageSize;
        let limitEnd = param.pageSize;
        limit = " limit " + limitEnd + " OFFSET " + limitStart;
    }
    const sqlSearchQuery = genSqlSearchQueryFunction();
    sqlQuery += sqlSearchQuery;
    sqlQuery += whereCondition;
    sqlQuery += orderBy;
    sqlQuery += limit;
    let items = [];
    let total = 0;
    const { rows: queryRows } = await (await getDb()).query(sqlQuery);
    for (let i = 0; i < queryRows.length; i++) {
        let item = queryRows[i];
        let resultItem = createResultItemDTOFunction();
        let keys = Object.keys(item);
        for (let n = 0; n < keys.length; n++) {
            let key = keys[n];
            resultItem[toHump(key)] = item[key];
        }
        resultItem.tagNameArray = [];
        resultItem.tagIdArray = [];
        resultItem.tagArray = [];
        items.push(resultItem);
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
            itemIdObjectMap.get(item[idColumn]).tagArray.push(item);
        });
    }
    let sqlCountSubTable = "";
    sqlCountSubTable += sqlSearchQuery;
    sqlCountSubTable += whereCondition;
    //count
    let sqlCount = `SELECT COUNT(*) AS total FROM (${sqlCountSubTable}) AS t1`;
    const { rows: queryCountRows } = await (await getDb()).query(sqlCount);
    total = queryCountRows[0].total;
    result.items = items;
    result.total = total;
    return result;
}