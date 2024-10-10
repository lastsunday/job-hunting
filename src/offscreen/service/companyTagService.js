import { Message } from "../../common/api/message";
import { postSuccessMessage, postErrorMessage } from "../util";
import { getDb, getOne, getAll } from "../database";
import { convertEmptyStringToNull, genUniqueId, genIdFromText } from "../../common/utils";
import dayjs from "dayjs";
import { CompanyTag } from "../../common/data/domain/companyTag";
import { Tag } from "../../common/data/domain/tag";
import { _addOrUpdateTag } from "./tagService";
import { CompanyTagDTO } from "../../common/data/dto/companyTagDTO";
import { SearchCompanyTagBO } from "../../common/data/bo/searchCompanyTagBO";
import { SearchCompanyTagDTO } from "../../common/data/dto/searchCompanyTagDTO";
import { StatisticCompanyTagDTO } from "../../common/data/dto/statisticCompanyTagDTO";

export const CompanyTagService = {
    /**
     *
     * @param {Message} message
     * @param {string} param id
     *
     * @returns CompanyTag
     */
    getCompanyTagById: async function (message, param) {
        try {
            postSuccessMessage(
                message,
                _getCompanyTagById(param)
            );
        } catch (e) {
            postErrorMessage(message, "[worker] getTagById error : " + e.message);
        }
    },
    /**
     *
     * @param {Message} message
     * @param {CompanyTag} param
     */
    addCompanyTag: async function (message, param) {
        try {
            await _addCompanyTag(param);
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] addOrUpdateTag error : " + e.message
            );
        }
    },
    /**
     *
     * @param {Message} message
     * @param {string} param companyId
     */
    deleteCompanyTagByCompanyId: async function (message, param) {
        try {
            await _deleteCompanyTagByCompanyId(param);
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] deleteCompanyTagByCompanyId error : " + e.message
            );
        }
    },
    /**
     *
     * @param {Message} message
     * @param {string[]} param companyIds
     */
    deleteCompanyTagByCompanyIds: async function (message, param) {
        try {
            if (param && param.length > 0) {
                await _deleteCompanyTagByCompanyIds(param);
                postSuccessMessage(message, {});
            } else {
                postErrorMessage(
                    message,
                    "[worker] deleteCompanyTagByCompanyIds error : companyIds is empty"
                );
            }
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] deleteCompanyTagByCompanyIds error : " + e.message
            );
        }
    },
    /**
     * 
     * @param {Message} message 
     * @param {CompanyTagBO} param 
     */
    addOrUpdateCompanyTag: async function (message, param) {
        try {
            (await getDb()).exec({
                sql: "BEGIN TRANSACTION",
            });
            await _addOrUpdateCompanyTag(param);
            (await getDb()).exec({
                sql: "COMMIT",
            });
            postSuccessMessage(message, {});
        } catch (e) {
            (await getDb()).exec({
                sql: "ROLLBACK TRANSACTION",
            });
            postErrorMessage(
                message,
                "[worker] addOrUpdateCompanyTag error : " + e.message
            );
        }
    },
    /**
     * 
     * @param {Message} message 
     * @param {CompanyTagBO[]} param 
     */
    batchAddOrUpdateCompanyTag: async function (message, param) {
        try {
            for (let i = 0; i < param.length; i++) {
                await _addOrUpdateCompanyTag(param[i]);
            }
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] batchAddOrUpdateCompanyTag error : " + e.message
            );
        }
    },
    /**
     * 
     * @param {Message} message 
     * @param {CompanyTagBO[]} param 
     */
    batchAddOrUpdateCompanyTagWithTransaction: async function (message, param) {
        try {
            (await getDb()).exec({
                sql: "BEGIN TRANSACTION",
            });
            for (let i = 0; i < param.length; i++) {
                await _addOrUpdateCompanyTag(param[i]);
            }
            (await getDb()).exec({
                sql: "COMMIT",
            });
            postSuccessMessage(message, {});
        } catch (e) {
            (await getDb()).exec({
                sql: "ROLLBACK TRANSACTION",
            });
            postErrorMessage(
                message,
                "[worker] batchAddOrUpdateCompanyTagWithTransaction error : " + e.message
            );
        }
    },
    /**
     *
     * @param {Message} message
     * @param {string} param companyId
     *
     * @returns CompanyTagDTO[]
     */
    getAllCompanyTagDTOByCompanyId: async function (message, param) {
        try {
            postSuccessMessage(
                message,
                await _getAllCompanyTagDTOByCompanyId(param)
            );
        } catch (e) {
            postErrorMessage(message, "[worker] getAllCompanyTagDTOByCompanyId error : " + e.message);
        }
    },
    /**
     *
     * @param {Message} message
     * @param {string[]} param ids
     *
     * @returns CompanyTagDTO[]
     */
    getAllCompanyTagDTOByCompanyIds: async function (message, param) {
        try {
            postSuccessMessage(
                message,
                await _getAllCompanyTagDTOByCompanyIds(param)
            );
        } catch (e) {
            postErrorMessage(message, "[worker] getAllCompanyTagDTOByCompanyIds error : " + e.message);
        }
    },
    /**
     * 
     * @param {Message} message 
     * @param {SearchCompanyTagBO} param 
     * 
     * @returns SearchCompanyTagDTO
     */
    searchCompanyTag: async function (message, param) {
        try {
            let result = new SearchCompanyTagDTO();
            let sqlQuery = "";
            let whereCondition = genCompanyTagSearchWhereConditionSql(param);
            let orderBy =
                " ORDER BY " +
                param.orderByColumn +
                " " +
                param.orderBy +
                " NULLS LAST";
            let limitStart = (param.pageNum - 1) * param.pageSize;
            let limitEnd = param.pageSize;
            let limit = " limit " + limitStart + "," + limitEnd;
            const sqlSearchQuery = genSqlSearchQuery(genCompanyTagSearchJoinOnConditionSql(param));
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
                let resultItem = new CompanyTagDTO();
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
                    ids.push(item.companyId);
                    itemIdObjectMap.set(item.companyId, item);
                });
                let companyTagDTOList = await _getAllCompanyTagDTOByCompanyIds(ids);
                companyTagDTOList.forEach(item => {
                    itemIdObjectMap.get(item.companyId).tagNameArray.push(item.tagName);
                    itemIdObjectMap.get(item.companyId).tagIdArray.push(item.tagId);
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
            postSuccessMessage(message, result);
        } catch (e) {
            postErrorMessage(message, "[worker] searchCompanyTag error : " + e.message);
        }
    },
    /**
   *
   * @param {Message} message
   * @param {*} param
   *
   * @returns {StatisticCompanyTagDTO}
   */
    statisticCompanyTag: async function (message, param) {
        try {
            let result = new StatisticCompanyTagDTO();
            let totalTagQueryResult = [];
            (await getDb()).exec({
                sql: `SELECT COUNT(*) AS count FROM tag`,
                rowMode: "object",
                resultRows: totalTagQueryResult,
            });
            let totalCompanyTagRecordQueryResult = [];
            (await getDb()).exec({
                sql: `SELECT COUNT(*) AS count FROM company_tag`,
                rowMode: "object",
                resultRows: totalCompanyTagRecordQueryResult,
            });
            let totalTagCompanyQueryResult = [];
            (await getDb()).exec({
                sql: `SELECT COUNT(DISTINCT company_id) AS count FROM company_tag`,
                rowMode: "object",
                resultRows: totalTagCompanyQueryResult,
            });
            result.totalTag = totalTagQueryResult[0].count;
            result.totalCompanyTagRecord = totalCompanyTagRecordQueryResult[0].count;
            result.totalTagCompany = totalTagCompanyQueryResult[0].count;
            postSuccessMessage(message, result);
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] statisticCompanyTag error : " + e.message
            );
        }
    },
};

/**
 * 
 * @param {CompanyTagBO} param 
 */
async function _addOrUpdateCompanyTag(param) {
    for (let i = 0; i < param.tags.length; i++) {
        let tagName = param.tags[i];
        let id = genIdFromText(tagName);
        let tag = new Tag();
        tag.tagId = id;
        tag.tagName = tagName;
        await _addOrUpdateTag(tag);
    }
    let companyName = param.companyName;
    let companyId = genIdFromText(companyName);
    await _deleteCompanyTagByCompanyId(companyId);
    for (let i = 0; i < param.tags.length; i++) {
        let tagName = param.tags[i];
        let tagId = genIdFromText(tagName);
        let companyTag = new CompanyTag();
        companyTag.companyTagId = genUniqueId();
        companyTag.companyId = companyId;
        companyTag.companyName = companyName;
        companyTag.tagId = tagId;
        companyTag.seq = i;
        await _addCompanyTag(companyTag);
    }
}

/**
 *
 * @param {SearchCompanyTagBO} param
 *
 * @returns string sql
 */
function genCompanyTagSearchWhereConditionSql(param) {
    let whereCondition = "";
    if (param.companyName) {
        whereCondition +=
            " AND companyName LIKE '%" + param.companyName + "%' ";
    }
    if (param.tagIds && param.tagIds.length > 0) {
        whereCondition +=
            ` AND COUNT(DISTINCT t1.tag_id) = ${param.tagIds.length}`;
    }
    if (param.startDatetimeForUpdate) {
        whereCondition +=
            " AND updateDatetime >= '" +
            dayjs(param.startDatetimeForUpdate).format("YYYY-MM-DD HH:mm:ss") +
            "'";
    }
    if (param.endDatetimeForUpdate) {
        whereCondition +=
            " AND updateDatetime < '" +
            dayjs(param.endDatetimeForUpdate).format("YYYY-MM-DD HH:mm:ss") +
            "'";
    }
    if (whereCondition.startsWith(" AND")) {
        whereCondition = whereCondition.replace("AND", "");
        whereCondition = " HAVING " + whereCondition;
    }
    return whereCondition;
}

/**
 *
 * @param {SearchCompanyTagBO} param
 *
 * @returns string sql
 */
function genCompanyTagSearchJoinOnConditionSql(param) {
    let whereCondition = "";
    if (param.tagIds && param.tagIds.length > 0) {
        let ids = "'" + param.tagIds.join("','") + "'";
        whereCondition +=
            ` AND t1.tag_id IN (${ids})`;
    }
    if (whereCondition.startsWith(" AND")) {
        whereCondition = whereCondition.replace("AND", "");
        whereCondition = " WHERE " + whereCondition;
    }
    return whereCondition;
}


/**
 * 
 * @param {string} param id
 */
export async function _getCompanyTagById(param) {
    return getOne(SQL_SELECT_BY_ID, [param], new Tag());
}

/**
 * 
 * @param {string} param id
 * 
 * @return CompanyTagDTO[]
 */
export async function _getAllCompanyTagDTOByCompanyId(param) {
    return getAll(SQL_SELECT_DTO_BY_COMPANY_ID, [param], new CompanyTagDTO());
}

/**
 * 
 * @param {string[]} param ids
 * 
 * @return CompanyTagDTO[]
 */
export async function _getAllCompanyTagDTOByCompanyIds(param) {
    let sqlSelectDTOByCompanyIds = genSqlSelectDTOByCompanyIds(param);
    return await getAll(sqlSelectDTOByCompanyIds, [], new CompanyTagDTO());
}

/**
 * 
 * @param {CompanyTag} param 
 */
export async function _addCompanyTag(param) {
    const now = new Date();
    (await getDb()).exec({
        sql: SQL_INSERT,
        bind: {
            $company_tag_id: convertEmptyStringToNull(param.companyTagId),
            $company_id: convertEmptyStringToNull(param.companyId),
            $company_name: convertEmptyStringToNull(param.companyName),
            $tag_id: convertEmptyStringToNull(param.tagId),
            $seq: convertEmptyStringToNull(param.seq),
            $create_datetime: dayjs(now).format("YYYY-MM-DD HH:mm:ss"),
            $update_datetime: dayjs(now).format("YYYY-MM-DD HH:mm:ss"),
        },
    });
}

/**
 * 
 * @param {string} param companyId
 */
export async function _deleteCompanyTagByCompanyId(param) {
    (await getDb()).exec({
        sql: SQL_DELETE_BY_COMPANY_ID,
        bind: [param],
    });
}

/**
 * 
 * @param {string[]} param companyIds
 */
export async function _deleteCompanyTagByCompanyIds(param) {
    (await getDb()).exec({
        sql: getSqlDeleteByCompanyIds(param),
    });
}

const SQL_SELECT = `SELECT company_tag_id, company_id, company_name,tag_id,seq ,create_datetime, update_datetime FROM company_tag`;
const SQL_SELECT_BY_ID = `${SQL_SELECT} WHERE company_tag_id = ?`;
const SQL_INSERT = `
INSERT INTO company_tag (company_tag_id, company_id, company_name,tag_id,seq,create_datetime, update_datetime) VALUES ($company_tag_id, $company_id, $company_name,$tag_id,$seq ,$create_datetime, $update_datetime)
`;
const SQL_DELETE_BY_COMPANY_ID = `
DELETE FROM company_tag WHERE company_id = ?
`;

const getSqlDeleteByCompanyIds = (ids) => {
    let idsString = "'" + ids.join("','") + "'";
    return `
        DELETE FROM company_tag WHERE company_id in (${idsString})
    `;
}

const SQL_SELECT_DTO_BY_COMPANY_ID = `
SELECT t1.company_tag_id, t1.company_id, t1.company_name,t1.tag_id, t2.tag_name,t1.seq ,t1.create_datetime, t1.update_datetime FROM company_tag AS t1  LEFT JOIN tag AS t2 ON t1.tag_id = t2.tag_id where company_id = ? ORDER BY t1.seq ASC;
`;

function genSqlSelectDTOByCompanyIds(ids) {
    let idsString = "'" + ids.join("','") + "'";
    return `
    SELECT t1.company_tag_id, t1.company_id, t1.company_name,t1.tag_id, t2.tag_name,t1.seq ,t1.create_datetime, t1.update_datetime FROM company_tag AS t1  LEFT JOIN tag AS t2 ON t1.tag_id = t2.tag_id where company_id in (${idsString}) ORDER BY t1.seq ASC;
    `;
}

function genSqlSearchQuery(whereCondition) {
    return `
    SELECT t1.company_tag_id AS companyTagId, t1.company_id AS companyId, t1.company_name AS companyName,t1.create_datetime AS createDatetime, t1.update_datetime AS updateDatetime FROM company_tag AS t1  LEFT JOIN tag AS t2 ON t1.tag_id = t2.tag_id ${whereCondition}  GROUP BY t1.company_id
    `
}