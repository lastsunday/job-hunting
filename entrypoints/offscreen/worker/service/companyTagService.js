import { Message } from "@/common/api/message";
import { CompanyTagBO } from "@/common/data/bo/companyTagBO";
import { CompanyTagBatchAddOrUpdateBO } from "@/common/data/bo/companyTagBatchAddOrUpdateBO";
import { CompanyTagExportBO } from "@/common/data/bo/companyTagExportBO";
import { SearchCompanyTagBO } from "@/common/data/bo/searchCompanyTagBO";
import { CompanyTag } from "@/common/data/domain/companyTag";
import { CompanyTagDTO } from "@/common/data/dto/companyTagDTO";
import { SearchCompanyTagDTO } from "@/common/data/dto/searchCompanyTagDTO";
import { StatisticCompanyTagDTO } from "@/common/data/dto/statisticCompanyTagDTO";
import { postErrorMessage, postSuccessMessage } from "@/common/extension/worker/util";
import { genIdFromText, genUniqueId, isBlank } from "@/common/utils";
import dayjs from "dayjs";
import { convertRows, getAll, getDb, getOne } from "../database";
import { BaseService } from "./baseService";
import { _addNotExistsTags, _searchWithTagInfo } from "./tagService";

const COMPANY_ID_COLUMN = "company_id";

const SERVICE_INSTANCE = new BaseService("company_tag", "company_tag_id",
    () => {
        return new CompanyTag();
    },
    () => {
        return new SearchCompanyTagDTO();
    },
    (param) => {
        let whereCondition = "";
        return whereCondition;
    }
);

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
                await getOne(`SELECT company_tag_id, company_id, company_name,tag_id,seq ,create_datetime, update_datetime,source_type,source FROM company_tag WHERE company_tag_id = $1`, [param], new CompanyTag())
            );
        } catch (e) {
            postErrorMessage(message, "[worker] getTagById error : " + e.message);
        }
    },
    /**
     *
     * @param {Message} message
     * @param {string} param companyId
     */
    deleteCompanyTagByCompanyId: async function (message, param) {
        try {
            await (await getDb()).query(`DELETE FROM company_tag WHERE company_id = $1`, [param]);
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
                await (await getDb()).exec(getSqlDeleteByCompanyIds(param));
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
            await (await getDb()).transaction(async (tx) => {
                return await _addOrUpdateCompanyTag(param, false, { connection: tx });
            });
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] addOrUpdateCompanyTag error : " + e.message
            );
        }
    },
    /**
     * 
     * @param {Message} message 
     * @param {CompanyTagBatchAddOrUpdateBO} param 
     */
    batchAddOrUpdateCompanyTag: async function (message, param) {
        try {
            await (await getDb()).transaction(async (tx) => {
                return await _batchAddOrUpdateCompanyTag({ companyTagBOs: param.items, overrideUpdateDatetime: param.overrideUpdateDatetime, connection: tx });
            });
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
     * @param {string} param companyId
     *
     * @returns CompanyTagDTO[]
     */
    getAllCompanyTagDTOByCompanyId: async function (message, param) {
        try {
            postSuccessMessage(
                message,
                await getAll(`SELECT t1.company_tag_id, t1.company_id, t1.company_name,t1.tag_id, t2.tag_name,t1.seq ,t1.create_datetime, t1.update_datetime,t1.source_type,t1.source,t2.is_public FROM company_tag AS t1  LEFT JOIN tag AS t2 ON t1.tag_id = t2.tag_id where company_id = $1 ORDER BY t1.seq ASC;`, [param], new CompanyTagDTO())
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
            let result = await _searchWithTagInfo({
                param,
                cerateResultDTOFunction: () => {
                    return new SearchCompanyTagDTO()
                },
                createResultItemDTOFunction: () => {
                    return new CompanyTagDTO();
                },
                genSqlSearchQueryFunction: () => {
                    let whereCondition = "";
                    if (param.tagNames && param.tagNames.length > 0) {
                        const tagIds = param.tagNames.map(item => { return genIdFromText(item) });
                        const ids = "'" + tagIds.join("','") + "'";
                        whereCondition +=
                            ` AND t1.tag_id IN (${ids})`;
                    }
                    if (param.tagIds && param.tagIds.length > 0) {
                        const ids = "'" + param.tagIds.join("','") + "'";
                        whereCondition +=
                            ` AND t1.tag_id IN (${ids})`;
                    }
                    if (whereCondition.startsWith(" AND")) {
                        whereCondition = whereCondition.replace("AND", "");
                        whereCondition = " WHERE " + whereCondition;
                    }
                    return `SELECT t1.company_id AS company_id,t1.company_name AS company_name,MAX(t1.create_datetime) AS create_datetime,MAX(t1.update_datetime) AS update_datetime FROM company_tag AS t1 LEFT JOIN tag AS t2 ON t1.tag_id = t2.tag_id ${whereCondition}  GROUP BY t1.company_id,t1.company_name`
                },
                genSearchWhereConditionSqlFunction: () => {
                    let whereCondition = "";
                    if (param.companyName) {
                        whereCondition +=
                            " AND company_name LIKE '%" + param.companyName + "%' ";
                    }
                    if (param.startDatetimeForUpdate) {
                        whereCondition +=
                            " AND update_datetime >= '" +
                            dayjs(param.startDatetimeForUpdate).format() +
                            "'";
                    }
                    if (param.endDatetimeForUpdate) {
                        whereCondition +=
                            " AND update_datetime < '" +
                            dayjs(param.endDatetimeForUpdate).format() +
                            "'";
                    }
                    if (whereCondition.startsWith(" AND")) {
                        whereCondition = whereCondition.replace("AND", "");
                        whereCondition = " HAVING " + whereCondition;
                    }
                    return whereCondition;
                },
                idColumn: "companyId",
                getAllDTOByIdsFunction: async (ids) => {
                    return _getAllCompanyTagDTOByCompanyIds(ids);
                }
            });
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
            let now = dayjs();
            let todayStart = now.startOf("day").format();
            let todayEnd = now
                .startOf("day")
                .add(1, "day")
                .format();
            let yesterdayStart = now
                .startOf("day")
                .add(2, "day")
                .format();
            let yesterdayEnd = now
                .startOf("day")
                .add(1, "day")
                .format();
            const { rows: totalTagQueryResult } = await (await getDb()).query(`SELECT COUNT(*) AS count FROM tag`);

            const tagQuerySql = `SELECT COUNT(*) AS count FROM tag WHERE create_datetime >= $1 AND create_datetime < $2`;
            const { rows: todayTagQueryResult } = await (await getDb()).query(tagQuerySql, [todayStart, todayEnd]);
            const { rows: yesterdayTagQueryResult } = await (await getDb()).query(tagQuerySql, [yesterdayStart, yesterdayEnd]);

            const { rows: totalCompanyTagRecordQueryResult } = await (await getDb()).query(`SELECT COUNT(*) AS count FROM company_tag`);

            const tagCompanyQuerySql = `SELECT COUNT(DISTINCT company_id) AS count FROM company_tag WHERE create_datetime >= $1 AND create_datetime < $2;`;
            const { rows: todayTagCompanyQueryResult } = await (await getDb()).query(tagCompanyQuerySql, [todayStart, todayEnd]);
            const { rows: yesterdayTagCompanyQueryResult } = await (await getDb()).query(tagCompanyQuerySql, [yesterdayStart, yesterdayEnd]);
            const { rows: totalTagCompanyQueryResult } = await (await getDb()).query(`SELECT COUNT(DISTINCT company_id) AS count FROM company_tag`);

            result.todayTag = todayTagQueryResult[0].count;
            result.yesterdayTag = yesterdayTagQueryResult[0].count;
            result.totalTag = totalTagQueryResult[0].count;
            result.totalCompanyTagRecord = totalCompanyTagRecordQueryResult[0].count;
            result.todayTagCompany = todayTagCompanyQueryResult[0].count;
            result.yesterdayTagCompany = yesterdayTagCompanyQueryResult[0].count;
            result.totalTagCompany = totalTagCompanyQueryResult[0].count;
            postSuccessMessage(message, result);
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] statisticCompanyTag error : " + e.message
            );
        }
    },
    /**
     *
     * @param {Message} message
     * @param {CompanyTagExportBO} param
     *
     * @returns CompanyTagExportDTO[]
     */
    companyTagExport: async function (message, param) {
        try {
            postSuccessMessage(
                message,
                await _companyTagExport({ param })
            );
        } catch (e) {
            postErrorMessage(message, "[worker] companyTagExport error : " + e.message);
        }
    },
};

/**
 * 
 * @param {CompanyTagExportBO} param 
 */
export async function _companyTagExport({ param = null, connection = null } = {}) {
    connection ??= await getDb();
    let limit = '';
    if (param.pageNum != null && param.pageSize != null) {
        let limitStart = (param.pageNum - 1) * param.pageSize;
        let limitEnd = param.pageSize;
        limit = " limit " + limitEnd + " OFFSET " + limitStart;
    }
    let joinCondition = "";
    if (param.startDatetimeForUpdate) {
        joinCondition +=
            " AND t1.update_datetime >= '" +
            dayjs(param.startDatetimeForUpdate).format() +
            "'";
    }
    if (param.endDatetimeForUpdate) {
        joinCondition +=
            " AND t1.update_datetime < '" +
            dayjs(param.endDatetimeForUpdate).format() +
            "'";
    }
    if (param.companyIds) {
        let idsString = "'" + param.companyIds.join("','") + "'";
        joinCondition +=
            ` AND t1.company_id in (${idsString})`;
    }
    let whereCondition = "";
    if (param.source != null) {
        if (isBlank(param.source)) {
            whereCondition +=
                `AND t1.source IS NULL`
        } else {
            whereCondition +=
                `AND t1.source = '${param.source}'`
        }
    }
    if (param.isPublic != null) {
        whereCondition += ` AND t2.is_public = ${param.isPublic}`
    }
    let sqlQuery = `SELECT t1.company_id AS company_id,t1.company_name AS company_name,STRING_AGG(DISTINCT t2.tag_name,',') AS tag_name_array,MAX(t1.create_datetime) AS create_datetime,MAX(t1.update_datetime) AS update_datetime FROM company_tag AS t1 LEFT JOIN tag AS t2 ON t1.tag_id = t2.tag_id ${joinCondition} WHERE t1.source_type = 0 ${whereCondition} GROUP BY t1.company_id,t1.company_name ORDER BY update_datetime DESC`;
    let querySql = sqlQuery + limit;
    let countSql = `SELECT COUNT(*) AS total FROM (${sqlQuery}) AS t1`;
    let result = {};
    const { rows: queryRows } = await connection.query(querySql);
    result.items = convertRows(queryRows);
    const { rows } = await connection.query(countSql);
    result.total = rows[0].total;
    return result;
}

/**
 * 
 * @param {CompanyTagBO[]} companyTagBOs 
 */
export async function _batchAddOrUpdateCompanyTag({ companyTagBOs = null, overrideUpdateDatetime = null, connection = null } = {}) {
    let allTags = [];
    companyTagBOs.map(item => { return item.tags }).forEach(items => {
        allTags.push(...items);
    })
    await _addNotExistsTags(allTags, { connection });
    let sourceTypeSourceAndIdsMap = new Map();
    let sourceTypeSourceAndSourceTypeMap = new Map();
    let sourceTypeSourceAndSourceMap = new Map();
    for (let i = 0; i < companyTagBOs.length; i++) {
        let item = companyTagBOs[i];
        let key = item.sourceType + "_" + item.source;
        if (!sourceTypeSourceAndIdsMap.has(key)) {
            sourceTypeSourceAndIdsMap.set(key, []);
            sourceTypeSourceAndSourceTypeMap.set(key, item.sourceType);
            sourceTypeSourceAndSourceMap.set(key, item.source);
        }
        sourceTypeSourceAndIdsMap.get(key).push(genIdFromText(item.companyName));
    }
    sourceTypeSourceAndIdsMap.forEach(async (value, key, map) => {
        let ids = sourceTypeSourceAndIdsMap.get(key);
        let sourceType = sourceTypeSourceAndSourceTypeMap.get(key);
        let source = sourceTypeSourceAndSourceMap.get(key);
        await SERVICE_INSTANCE._deleteByIds(ids, COMPANY_ID_COLUMN, { connection, otherCondition: `source_type=${sourceType} AND ${source ? "source = '" + source + "'" : "source IS NULL"}` });
    });
    let companyTags = [];
    for (let i = 0; i < companyTagBOs.length; i++) {
        let item = companyTagBOs[i];
        let companyName = item.companyName;
        let companyId = genIdFromText(companyName);
        for (let i = 0; i < item.tags.length; i++) {
            let tagName = item.tags[i];
            let tagId = genIdFromText(tagName);
            let companyTag = new CompanyTag();
            companyTag.companyTagId = genUniqueId();
            companyTag.companyId = companyId;
            companyTag.companyName = companyName;
            companyTag.tagId = tagId;
            companyTag.seq = i;
            companyTag.sourceType = item.sourceType;
            companyTag.source = item.source;
            companyTag.updateDatetime = item.updateDatetime;
            companyTags.push(companyTag);
        }
    }
    await SERVICE_INSTANCE._batchAddOrUpdate(companyTags, { connection, overrideUpdateDatetime });
}

/**
 * 
 * @param {CompanyTagBO} param 
 */
async function _addOrUpdateCompanyTag(param, overrideUpdateDatetime, { connection = null } = {}) {
    await _addNotExistsTags(param.tags, { connection });
    let companyName = param.companyName;
    let companyId = genIdFromText(companyName);
    await SERVICE_INSTANCE._deleteById(companyId, COMPANY_ID_COLUMN, { connection, otherCondition: `source_type=${param.sourceType} AND ${param.source ? "source = '" + param.source + "'" : "source IS NULL"}` });
    let companyTags = [];
    for (let i = 0; i < param.tags.length; i++) {
        let tagName = param.tags[i];
        let tagId = genIdFromText(tagName);
        let companyTag = new CompanyTag();
        companyTag.companyTagId = genUniqueId();
        companyTag.companyId = companyId;
        companyTag.companyName = companyName;
        companyTag.tagId = tagId;
        companyTag.seq = i;
        companyTag.sourceType = param.sourceType;
        companyTag.source = param.source;
        companyTag.updateDatetime = param.updateDatetime;
        companyTags.push(companyTag);
    }
    await SERVICE_INSTANCE._batchAddOrUpdate(companyTags, { connection, overrideUpdateDatetime });
}

/**
 * 
 * @param {string[]} param ids
 * 
 * @return CompanyTagDTO[]
 */
export async function _getAllCompanyTagDTOByCompanyIds(param, { connection = null } = {}) {
    let sqlSelectDTOByCompanyIds = genSqlSelectDTOByCompanyIds(param);
    return await getAll(sqlSelectDTOByCompanyIds, [], new CompanyTagDTO(), { connection });
}

const getSqlDeleteByCompanyIds = (ids) => {
    let idsString = "'" + ids.join("','") + "'";
    return `
        DELETE FROM company_tag WHERE company_id in (${idsString})
    `;
}

function genSqlSelectDTOByCompanyIds(ids) {
    let idsString = "'" + ids.join("','") + "'";
    return `
    SELECT t1.company_tag_id, t1.company_id, t1.company_name,t1.tag_id, t2.tag_name,t1.seq ,t1.create_datetime, t1.update_datetime,t1.source_type,t1.source,t2.is_public FROM company_tag AS t1  LEFT JOIN tag AS t2 ON t1.tag_id = t2.tag_id where company_id in (${idsString}) ORDER BY t1.seq ASC;
    `;
}
