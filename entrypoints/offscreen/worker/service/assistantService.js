import { Message } from "@/common/api/message";
import { SearchFaviousJobBO } from "@/common/data/bo/searchFaviousJobBO";
import { Config } from "@/common/data/domain/config";
import { JobFaviousSettingDTO } from "@/common/data/dto/jobFaviousSettingDTO";
import { SearchJobDTO } from "@/common/data/dto/searchJobDTO";
import { postErrorMessage, postSuccessMessage } from "@/common/extension/worker/util";
import { genIdFromText } from "@/common/utils";
import dayjs from "dayjs";
import { convertRows, getDb } from "../database";
import { _addOrUpdateConfig, _getConfigByKey } from "./configService";
import { _fillSearchResultExtraInfo } from "./jobService";
import { genDatetimeConditionSql, genLikeSql, genNotLikeSql, genValueConditionSql, handleAndReturnWhereSql } from "./sqlUtil";

const KEY_JOB_FAVIOUS_SETTING = "KEY_JOB_FAVIOUS_SETTING";

export const AssistantService = {

    /**
   *
   * @param {Message} message
   * @param {SearchFaviousJobBO} param
   *
   * @returns SearchJobDTO
   */
    assistantSearchFaviousJob: async function (message, param) {
        try {
            let result = new SearchJobDTO();
            let sqlQuery = "";
            let whereCondition = genJobSearchWhereConditionSql(param);
            let orderBy = "";
            if (param.orderByColumn != null && param.orderBy != null) {
                orderBy =
                    " ORDER BY " +
                    param.orderByColumn +
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
            sqlQuery += genSqlJobSearchQuery(param);
            sqlQuery += whereCondition;
            sqlQuery = genFilterSQL(sqlQuery, param);
            let sqlQueryCountSubSql = sqlQuery;
            sqlQuery += orderBy;
            sqlQuery += limit;
            let items = [];
            let total = 0;
            const { rows } = await (await getDb()).query(sqlQuery);
            const queryRows = convertRows(rows);
            await _fillSearchResultExtraInfo(items, queryRows);
            //count
            let sqlCount = `SELECT COUNT(*) AS total from (${sqlQueryCountSubSql}) AS t1`;
            const { rows: queryCountRows } = await (await getDb()).query(sqlCount);
            total = queryCountRows[0].total;
            result.items = items;
            result.total = total;
            postSuccessMessage(message, result);
        } catch (e) {
            postErrorMessage(message, "[worker] assistantSearchJob error : " + e.message);
        }
    },
    /**
     *
     * @param {Message} message
     * @param {JobFaviousSettingDTO} param
     */
    assistantSetJobFaviousSetting: async function (message, param) {
        try {
            await _setJobFaviousSetting(param);
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] assistantSetJobFaviousSetting error : " + e.message
            );
        }
    },
    /**
    *
    * @param {Message} message
    * @param {} param
    */
    assistantGetJobFaviousSetting: async function (message, param) {
        try {
            postSuccessMessage(message, await _getJobFaviousSetting());
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] assistantGetJobFaviousSetting error : " + e.message
            );
        }
    },
};

/**
 * 
 * @param {JobFaviousSettingDTO} param 
 * @param {*} todayStart 
 * @param {*} todayEnd 
 * @returns 
 */
function genFaviousJobCountSQL(param, todayStart, todayEnd) {
    let sqlQuery = "";
    let whereCondition = genJobSearchWhereConditionSql(param);
    sqlQuery += genSqlJobSearchQuery(param);
    sqlQuery += whereCondition;
    sqlQuery = genFilterSQL(sqlQuery, param, todayStart, todayEnd);
    return `SELECT COUNT(*) AS count FROM (${sqlQuery}) AS t1`
}

/**
 *
 * @param {SearchFaviousJobBO} param
 *
 * @returns string sql
 */
function genJobSearchWhereConditionSql(param) {
    let whereCondition = "";
    whereCondition += genLikeSql(param.nameKeywordList, "job_name");
    whereCondition += genNotLikeSql(param.nameDislikeKeywordList, "job_name");
    whereCondition += genValueConditionSql(param.salary, "job_salary_max", ">=")
    whereCondition += genLikeSql(param.addressKeywordList, "job_address");
    whereCondition += genLikeSql(param.descKeywordList, "job_description");
    whereCondition += genNotLikeSql(param.descDislikeKeywordList, "job_description");
    whereCondition += genNotLikeSql(param.bossPositionDislikeKeywordList, "boss_position");
    if (param.publishDateOffset && param.publishDateOffset > 0) {
        let offsetDatetime = dayjs().subtract(param.publishDateOffset, "millisecond");
        whereCondition += genDatetimeConditionSql(offsetDatetime, "job_first_publish_datetime", ">=");
    }
    whereCondition = handleAndReturnWhereSql(whereCondition);
    whereCondition += ` GROUP BY t1.job_id `;
    return whereCondition;
}

function genSqlJobSearchQuery(param) {
    // let joinSql = `LEFT JOIN (SELECT job_id AS _jobId,COUNT(job_id) AS browseDetailCount,MAX(job_visit_datetime) AS latestBrowseDetailDatetime FROM JOB_BROWSE_HISTORY WHERE job_visit_type = 'DETAIL' GROUP BY job_id) AS t2 ON t1.job_id = t2._jobId`;
    let joinSql = ` LEFT JOIN company_tag AS t3 ON t1.job_company_name = t3.company_name`;
    joinSql += ` LEFT JOIN job_tag AS t4 ON t1.job_id = t4.job_id`;
    return `SELECT t1.job_id AS job_id,job_platform,job_url,job_name,job_company_name,job_location_name,job_address,job_longitude,job_latitude,job_description,job_degree_name,job_year,job_salary_min,job_salary_max,job_salary_total_month,job_first_publish_datetime,boss_name,boss_company_name,boss_position,t1.create_datetime AS create_datetime,t1.update_datetime AS update_datetime,t1.skill_tag,t1.welfare_tag,STRING_AGG(t3.tag_id,',') AS company_tag_id_array,STRING_AGG(t4.tag_id,',') AS job_tag_id_array FROM job AS t1 ${joinSql}`;
}

function genFilterSQL(sql, param, createDateStartDate, createDateEndDate) {
    let whereCondition = "";
    if (param.dislikeCompanyTagList && param.dislikeCompanyTagList.length > 0) {
        whereCondition += " AND (";
        param.dislikeCompanyTagList.forEach((item, index) => {
            if (index > 0) {
                whereCondition += " AND ";
            }
            whereCondition += " t1.company_tag_id_array NOT LIKE '%" + genIdFromText(item) + "%' ";
        });
        whereCondition += " )";
        whereCondition += ` OR t1.company_tag_id_array IS NULL`;
    }
    if (param.likeJobTagList && param.likeJobTagList.length > 0) {
        whereCondition += " AND (";
        param.likeJobTagList.forEach((item, index) => {
            if (index > 0) {
                whereCondition += " AND ";
            }
            whereCondition += " t1.job_tag_id_array LIKE '%" + genIdFromText(item) + "%' ";
        });
        whereCondition += " )";
    }
    if (param.dislikeJobTagList && param.dislikeJobTagList.length > 0) {
        whereCondition += " AND (";
        param.dislikeJobTagList.forEach((item, index) => {
            if (index > 0) {
                whereCondition += " AND ";
            }
            whereCondition += " t1.job_tag_id_array NOT LIKE '%" + genIdFromText(item) + "%' ";
        });
        whereCondition += " )";
        if (!(param.likeJobTagList && param.likeJobTagList.length > 0)) {
            whereCondition += ` OR t1.job_tag_id_array IS NULL`;
        }
    }
    if (createDateStartDate) {
        whereCondition +=
            " AND createDatetime >= '" +
            dayjs(createDateStartDate).format() +
            "'";
    }
    if (createDateEndDate) {
        whereCondition +=
            " AND createDatetime < '" +
            dayjs(createDateEndDate).format() +
            "'";
    }
    if (whereCondition.startsWith(" AND")) {
        whereCondition = whereCondition.replace("AND", "");
        whereCondition = " WHERE " + whereCondition;
    }
    return `SELECT * FROM ( ${sql})  AS t1 ${whereCondition}`
}


/**
 * 
 * @param {JobFaviousSettingDTO} dto 
 */
export async function _setJobFaviousSetting(dto) {
    let config = new Config();
    config.key = KEY_JOB_FAVIOUS_SETTING;
    config.value = JSON.stringify(dto);
    return _addOrUpdateConfig(config);
}

/**
 * 
 * @returns JobFaviousSettingDTO
 */
export async function _getJobFaviousSetting() {
    let item = new JobFaviousSettingDTO();
    let config = await _getConfigByKey(KEY_JOB_FAVIOUS_SETTING);
    if (config) {
        let value = JSON.parse(config.value);
        if (value) {
            Object.assign(item, value);
            return item;
        }
    }
    return item;
}
