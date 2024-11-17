import { Message } from "../../common/api/message";
import { postSuccessMessage, postErrorMessage } from "../util";
import { getDb } from "../database";
import { SearchFaviousJobBO } from "../../common/data/bo/searchFaviousJobBO";
import { SearchJobDTO } from "../../common/data/dto/searchJobDTO";
import { JobFaviousSettingDTO } from "../../common/data/dto/jobFaviousSettingDTO";
import { AssistantStatisticDTO } from "../../common/data/dto/assistantStatisticDTO";
import { Config } from "../../common/data/domain/config";
import { _getAllCompanyTagDTOByCompanyIds } from "./companyTagService";
import { _addOrUpdateConfig, _getConfigByKey } from "./configService";
import dayjs from "dayjs";
import { _getCompanyDTOByIds } from "./companyService";
import { genNotLikeSql, genLikeSql, handleAndReturnWhereSql, genDatetimeConditionSql, genValueConditionSql } from "./sqlUtil";
import { _fillSearchResultExtraInfo } from "./jobService";

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
            let orderBy =
                " ORDER BY " +
                param.orderByColumn +
                " " +
                param.orderBy +
                " NULLS LAST";
            let limitStart = (param.pageNum - 1) * param.pageSize;
            let limitEnd = param.pageSize;
            let limit = " limit " + limitStart + "," + limitEnd;
            sqlQuery += genSqlJobSearchQuery(param);
            sqlQuery += whereCondition;
            sqlQuery = genFilterSQL(sqlQuery, param);
            let sqlQueryCountSubSql = sqlQuery;
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
            await _fillSearchResultExtraInfo(items, queryRows);
            //count
            let sqlCount = `SELECT COUNT(*) AS total from (${sqlQueryCountSubSql}) AS t1`;
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
    /**
     *
     * @param {Message} message
     * @param {*} param
     *
     * @returns {AssistantStatisticDTO}
     */
    assistantStatistic: async function (message, param) {
        try {
            let jobFaviousSettingDTO = await _getJobFaviousSetting();
            let result = new AssistantStatisticDTO();
            let now = dayjs();
            let todayStart = now.startOf("day").format("YYYY-MM-DD HH:mm:ss");
            let todayEnd = now
                .startOf("day")
                .add(1, "day")
                .format("YYYY-MM-DD HH:mm:ss");

            let todayFaviousJobCount = [];
            (await getDb()).exec({
                sql: genFaviousJobCountSQL(jobFaviousSettingDTO, todayStart, todayEnd),
                rowMode: "object",
                resultRows: todayFaviousJobCount,
            });

            let totalFaviousJob = [];
            let totalSql = genFaviousJobCountSQL(jobFaviousSettingDTO);
            (await getDb()).exec({
                sql: totalSql,
                rowMode: "object",
                resultRows: totalFaviousJob,
            });
            result.todayFaviousJobCount = todayFaviousJobCount[0].count;
            result.totalFaviousJob = totalFaviousJob[0].count;
            postSuccessMessage(message, result);
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] assistantStatistic error : " + e.message
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
    let joinSql = `LEFT JOIN (SELECT job_id AS _jobId,COUNT(job_id) AS browseDetailCount,MAX(job_visit_datetime) AS latestBrowseDetailDatetime FROM JOB_BROWSE_HISTORY WHERE job_visit_type = 'DETAIL' GROUP BY job_id) AS t2 ON t1.job_id = t2._jobId`;
    joinSql += ` LEFT JOIN company_tag AS t3 ON t1.job_company_name = t3.company_name`;
    joinSql += ` LEFT JOIN job_tag AS t4 ON t1.job_id = t4.job_id`;
    return `SELECT t1.job_id AS jobId,job_platform AS jobPlatform,job_url AS jobUrl,job_name AS jobName,job_company_name AS jobCompanyName,job_location_name AS jobLocationName,job_address AS jobAddress,job_longitude AS jobLongitude,job_latitude AS jobLatitude,job_description AS jobDescription,job_degree_name AS jobDegreeName,job_year AS jobYear,job_salary_min AS jobSalaryMin,job_salary_max AS jobSalaryMax,job_salary_total_month AS jobSalaryTotalMonth,job_first_publish_datetime AS jobFirstPublishDatetime,boss_name AS bossName,boss_company_name AS bossCompanyName,boss_position AS bossPosition,t1.create_datetime AS createDatetime,t1.update_datetime AS updateDatetime,IFNULL(t2.browseDetailCount,0) AS browseDetailCount,t2.latestBrowseDetailDatetime AS latestBrowseDetailDatetime,GROUP_CONCAT(t3.tag_id) AS companyTagIdArray,GROUP_CONCAT(t4.tag_id) AS jobTagIdArray FROM job AS t1 ${joinSql}`;
}

function genFilterSQL(sql, param, createDateStartDate, createDateEndDate) {
    let whereCondition = "";
    if (param.dislikeCompanyTagList && param.dislikeCompanyTagList.length > 0) {
        whereCondition += " AND (";
        param.dislikeCompanyTagList.forEach((item, index) => {
            if (index > 0) {
                whereCondition += " AND ";
            }
            whereCondition += " t1.companyTagIdArray NOT LIKE '%" + item + "%' ";
        });
        whereCondition += " )";
        whereCondition += ` OR t1.companyTagIdArray IS NULL`;
    }
    if (param.likeJobTagList && param.likeJobTagList.length > 0) {
        whereCondition += " AND (";
        param.likeJobTagList.forEach((item, index) => {
            if (index > 0) {
                whereCondition += " AND ";
            }
            whereCondition += " t1.jobTagIdArray LIKE '%" + item + "%' ";
        });
        whereCondition += " )";
    }
    if (param.dislikeJobTagList && param.dislikeJobTagList.length > 0) {
        whereCondition += " AND (";
        param.dislikeJobTagList.forEach((item, index) => {
            if (index > 0) {
                whereCondition += " AND ";
            }
            whereCondition += " t1.jobTagIdArray NOT LIKE '%" + item + "%' ";
        });
        whereCondition += " )";
        if (!(param.likeJobTagList && param.likeJobTagList.length > 0)) {
            whereCondition += ` OR t1.jobTagIdArray IS NULL`;
        }
    }
    if (createDateStartDate) {
        whereCondition +=
            " AND createDatetime >= '" +
            dayjs(createDateStartDate).format("YYYY-MM-DD HH:mm:ss") +
            "'";
    }
    if (createDateEndDate) {
        whereCondition +=
            " AND createDatetime < '" +
            dayjs(createDateEndDate).format("YYYY-MM-DD HH:mm:ss") +
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
