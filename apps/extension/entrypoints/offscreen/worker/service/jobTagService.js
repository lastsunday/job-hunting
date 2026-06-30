import { Message } from "@/common/api/message";
import { JobTagBatchAddOrUpdateBO } from "@/common/data/bo/jobTagBatchAddOrUpdateBO";
import { JobTagBO } from "@/common/data/bo/jobTagBO";
import { JobTagExportBO } from "@/common/data/bo/jobTagExportBO";
import { JobTagNameStatisticBO } from "@/common/data/bo/jobTagNameStatisticBO";
import { JobTagSearchBO } from "@/common/data/bo/jobTagSearchBO";
import { JobTag } from "@/common/data/domain/jobTag";
import { JobTagDTO } from "@/common/data/dto/jobTagDTO";
import { JobTagNameStatisticDTO } from "@/common/data/dto/jobTagNameStatisticDTO";
import { JobTagSearchDTO } from "@/common/data/dto/jobTagSearchDTO";
import { postErrorMessage, postSuccessMessage } from "@/common/extension/worker/util";
import { genIdFromText, genUniqueId, isBlank } from "@/common/utils";
import dayjs from "dayjs";
import { convertRows, getAll, getDb } from "../database";
import { BaseService } from "./baseService";
import { _jobGetByIds } from "./jobService";
import { _addNotExistsTags, _searchWithTagInfo, _batchGetTagByIds } from "./tagService";
import { PageBO } from "@/common/data/bo/pageBO";

const JOB_ID_COLUMN = "job_id";

const SERVICE_INSTANCE = new BaseService("job_tag", "id",
    () => {
        return new JobTag();
    },
    () => {
        return new JobTagSearchDTO();
    },
    (param) => {
        const whereCondition = "";
        return whereCondition;
    }
);

export const JobTagService = {
    /**
     * 
     * @param {*} message 
     * @param {JobTagSearchBO} param 
     */
    jobTagSearch: async function (message, param) {
        try {
            const result = await _searchWithTagInfo({
                param,
                cerateResultDTOFunction: () => {
                    return new JobTagSearchDTO()
                },
                createResultItemDTOFunction: () => {
                    return new JobTagDTO();
                },
                genSqlSearchQueryFunction: () => {
                    let whereCondition = "";
                    if (param.tagIds && param.tagIds.length > 0) {
                        const ids = "'" + param.tagIds.join("','") + "'";
                        whereCondition +=
                            ` AND t1.tag_id IN (${ids})`;
                    }
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
                    return `SELECT t1.job_id AS job_id, MAX(t1.create_datetime) AS create_datetime, MAX(t1.update_datetime) AS update_datetime FROM job_tag AS t1 LEFT JOIN tag AS t2 ON t1.tag_id = t2.tag_id ${whereCondition} GROUP BY t1.job_id`;
                },
                genSearchWhereConditionSqlFunction: () => {
                    let whereCondition = "";
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
                idColumn: "jobId",
                getAllDTOByIdsFunction: async (ids) => {
                    return _getAllJobTagDTOByJobIds(ids);
                }
            });
            const items = result.items;
            if (items && items.length > 0) {
                const jobIds = [];
                const jobIdAndItemMap = new Map();
                items.forEach(item => {
                    jobIds.push(item.jobId);
                    jobIdAndItemMap.set(item.jobId, item);
                });
                const jobs = await _jobGetByIds({ param: jobIds });
                if (jobs && jobs.length > 0) {
                    jobs.forEach(item => {
                        if (jobIdAndItemMap.has(item.jobId)) {
                            jobIdAndItemMap.get(item.jobId).job = item;
                        }
                    });
                }
            }
            postSuccessMessage(message, result);
        } catch (e) {
            postErrorMessage(message, "[worker] jobTagSearch error : " + e.message);
        }
    },
    /**
     *
     * @param {Message} message
     * @param {string[]} param jobIds
     */
    jobTagDeleteByJobIds: async function (message, param) {
        SERVICE_INSTANCE.deleteByIds(message, param, JOB_ID_COLUMN);
    },
    /**
     * 
     * @param {Message} message 
     * @param {JobTagBO} param 
     */
    jobTagAddOrUpdate: async function (message, param) {
        try {
            await (await getDb()).transaction(async (tx) => {
                return await _jobTagBatchAddOrUpdate([param], false, { connection: tx });
            });
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] jobTagAddOrUpdate error : " + e.message
            );
        }
    },
    /**
     * 
     * @param {Message} message 
     * @param {JobTagBatchAddOrUpdateBO} param 
     */
    jobTagBatchAddOrUpdate: async function (message, param) {
        try {
            await (await getDb()).transaction(async (tx) => {
                return await _jobTagBatchAddOrUpdate(param.items, param.overrideUpdateDatetime, { connection: tx });
            });
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] jobTagBatchAddOrUpdate error : " + e.message
            );
        }
    },
    /**
     *
     * @param {Message} message
     * @param {string} param jobId
     *
     * @returns JobTagDTO[]
     */
    jobTagGetAllDTOByJobId: async function (message, param) {
        try {
            postSuccessMessage(
                message,
                await _getAllJobTagDTOByJobId(param)
            );
        } catch (e) {
            postErrorMessage(message, "[worker] jobTagGetAllDTOByJobId error : " + e.message);
        }
    },
    /**
     *
     * @param {Message} message
     * @param {string[]} param ids
     *
     * @returns JobTagDTO[]
     */
    jobTagGetAllDTOByJobIds: async function (message, param) {
        try {
            postSuccessMessage(
                message,
                await _getAllJobTagDTOByJobIds(param)
            );
        } catch (e) {
            postErrorMessage(message, "[worker] jobTagGetAllDTOByJobIds error : " + e.message);
        }
    },

    /**
     *
     * @param {Message} message
     * @param {JobTagExportBO} param
     *
     * @returns JobTagExportDTO[]
     */
    jobTagExport: async function (message, param) {
        try {
            postSuccessMessage(
                message,
                await _jobTagExport({ param })
            );
        } catch (e) {
            postErrorMessage(message, "[worker] jobTagExport error : " + e.message);
        }
    },
    /**
     *
     * @param {Message} message
     * @param {JobTagNameStatisticBO} param
     *
     * @returns {JobTagNameStatisticDTO}
     */
    jobTagNameStatistic: async function (message, param) {
        try {
            let limit = '';
            if (param.pageNum != null && param.pageSize != null) {
                const limitStart = (param.pageNum - 1) * param.pageSize;
                const limitEnd = param.pageSize;
                limit = " limit " + limitEnd + " OFFSET " + limitStart;
            }
            const result = new JobTagNameStatisticDTO();
            const sqlTagNameTotal = `SELECT tag_name AS name,COUNT(t1.job_id) AS count FROM job_tag t1 LEFT JOIN tag t2 ON t1.tag_id = t2.tag_id GROUP BY name ORDER BY count DESC ${limit}`;
            const { rows: totalTagNameTotalQueryResult } = await (await getDb()).query(sqlTagNameTotal);
            const { rows: totalJobQueryResult } = await (await getDb()).query(`SELECT COUNT(*) total FROM (SELECT t1.job_id FROM job_tag t1 GROUP BY t1.job_id) t1`);
            result.items = totalTagNameTotalQueryResult;
            result.total = totalJobQueryResult[0].total;
            postSuccessMessage(message, result);
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] jobTagNameStatistic error : " + e.message
            );
        }
    },
    /**
     *
     * @param {Message} message
     * @param {PageBO} param
     *
     * @returns Tag[]
     */
    jobTagGetRecentlyTag: async function (message, param) {
        try {
            let limit = '';
            if (param.pageNum != null && param.pageSize != null) {
                const limitStart = (param.pageNum - 1) * param.pageSize;
                const limitEnd = param.pageSize;
                limit = " limit " + limitEnd + " OFFSET " + limitStart;
            }
            const result = [];
            const sqlQuery = `SELECT tag_id,MAX(update_datetime) update_datetime FROM job_tag WHERE source_type = 0 AND source IS NULL GROUP BY tag_id ORDER BY update_datetime DESC ${limit}`;
            const { rows } = await (await getDb()).query(sqlQuery);
            if (rows && rows.length > 0) {
                const ids = rows.map(item => { return item.tag_id });
                const tags = await _batchGetTagByIds(ids);
                const tagsIdMap = new Map(tags.map(item => [item.tagId, item]))
                ids.forEach(item => {
                    const tag = tagsIdMap.get(item);
                    if (tag) {
                        result.push(tag);
                    }
                });
            }
            postSuccessMessage(message, result);
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] jobTagNameStatistic error : " + e.message
            );
        }
    }
};

/**
 * 
 * @param {JobTagExportBO} param 
 */
export async function _jobTagExport({ param = null, connection = null } = {}) {
    connection ??= await getDb();
    let limit = '';
    if (param.pageNum != null && param.pageSize != null) {
        const limitStart = (param.pageNum - 1) * param.pageSize;
        const limitEnd = param.pageSize;
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
    if (param.jobIds) {
        const idsString = "'" + param.jobIds.join("','") + "'";
        joinCondition +=
            ` AND t1.job_id in (${idsString})`;
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
    const sqlQuery = `SELECT t1.job_id AS job_id,STRING_AGG(DISTINCT t2.tag_name,',') AS tag_name_array,MAX(t1.create_datetime) AS create_datetime,MAX(t1.update_datetime) AS update_datetime FROM job_tag AS t1 LEFT JOIN tag AS t2 ON t1.tag_id = t2.tag_id ${joinCondition} WHERE t1.source_type = 0 ${whereCondition} GROUP BY t1.job_id ORDER BY update_datetime DESC`;
    const querySql = sqlQuery + limit;
    const countSql = `SELECT COUNT(*) AS total FROM (${sqlQuery}) AS t1`;
    const result = {};
    const { rows: queryRows } = await connection.query(querySql);
    result.items = convertRows(queryRows);
    const { rows } = await connection.query(countSql);
    result.total = rows[0].total;
    return result;
}

/**
 * 
 * @param {JobTagBO[]} jobTagBOs 
 */
export async function _jobTagBatchAddOrUpdate(jobTagBOs, overrideUpdateDatetime, { connection = null } = {}) {
    const allTags = [];
    jobTagBOs.map(item => { return item.tags }).forEach(items => {
        allTags.push(...items);
    })
    await _addNotExistsTags(allTags, { connection });
    const sourceTypeSourceAndJobIdsMap = new Map();
    const sourceTypeSourceAndSourceTypeMap = new Map();
    const sourceTypeSourceAndSourceMap = new Map();
    for (let i = 0; i < jobTagBOs.length; i++) {
        const item = jobTagBOs[i];
        const key = item.sourceType + "_" + item.source;
        if (!sourceTypeSourceAndJobIdsMap.has(key)) {
            sourceTypeSourceAndJobIdsMap.set(key, []);
            sourceTypeSourceAndSourceTypeMap.set(key, item.sourceType);
            sourceTypeSourceAndSourceMap.set(key, item.source);
        }
        sourceTypeSourceAndJobIdsMap.get(key).push(item.jobId);
    }
    for (const [key] of sourceTypeSourceAndJobIdsMap) {
        const ids = sourceTypeSourceAndJobIdsMap.get(key);
        const sourceType = sourceTypeSourceAndSourceTypeMap.get(key);
        const source = sourceTypeSourceAndSourceMap.get(key);
        await SERVICE_INSTANCE._deleteByIds(ids, JOB_ID_COLUMN, { connection, otherCondition: `source_type=${sourceType} AND ${source ? "source = '" + source + "'" : "source IS NULL"}` });
    }
    const jobTags = [];
    for (let i = 0; i < jobTagBOs.length; i++) {
        const item = jobTagBOs[i];
        const jobId = item.jobId;
        for (let i = 0; i < item.tags.length; i++) {
            const tagName = item.tags[i];
            const tagId = genIdFromText(tagName);
            const jobTag = new JobTag();
            jobTag.id = genUniqueId();
            jobTag.jobId = jobId;
            jobTag.tagId = tagId;
            jobTag.seq = i;
            jobTag.sourceType = item.sourceType;
            jobTag.source = item.source;
            jobTag.updateDatetime = item.updateDatetime;
            jobTags.push(jobTag);
        }
    }
    await SERVICE_INSTANCE._batchAddOrUpdate(jobTags, { connection, overrideUpdateDatetime });
}

/**
 * 
 * @param {string} param id
 * 
 * @return JobTagDTO[]
 */
export async function _getAllJobTagDTOByJobId(param) {
    return getAll(`SELECT t1.id, t1.job_id, t1.tag_id, t2.tag_name,t1.seq ,t1.create_datetime, t1.update_datetime,t1.source_type,t1.source,t2.is_public FROM job_tag AS t1  LEFT JOIN tag AS t2 ON t1.tag_id = t2.tag_id where job_id = $1 ORDER BY t1.seq ASC;`, [param], new JobTagDTO());
}

/**
 * 
 * @param {string[]} param ids
 * 
 * @return JobTagDTO[]
 */
export async function _getAllJobTagDTOByJobIds(param, { connection = null } = {}) {
    const sql = genSqlSelectDTOByJobIds(param);
    return await getAll(sql, [], new JobTagDTO(), { connection });
}

function genSqlSelectDTOByJobIds(ids) {
    const idsString = "'" + ids.join("','") + "'";
    return `
    SELECT t1.id, t1.job_id, t1.tag_id, t2.tag_name,t1.seq ,t1.create_datetime, t1.update_datetime,t1.source_type,t1.source,t2.is_public FROM job_tag AS t1  LEFT JOIN tag AS t2 ON t1.tag_id = t2.tag_id where job_id in (${idsString}) ORDER BY t1.seq ASC;
    `;
}
