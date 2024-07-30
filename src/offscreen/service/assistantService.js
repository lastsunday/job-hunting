import { Message } from "../../common/api/message";
import { postSuccessMessage, postErrorMessage } from "../util";
import { getDb, getOne, getAll } from "../database";
import { SearchFaviousJobBO } from "../../common/data/bo/searchFaviousJobBO";
import { SearchJobDTO } from "../../common/data/dto/searchJobDTO";
import { JobFaviousSettingDTO } from "../../common/data/dto/jobFaviousSettingDTO";
import { AssistantStatisticDTO } from "../../common/data/dto/assistantStatisticDTO";
import { Config } from "../../common/data/domain/config";
import { toHump, convertEmptyStringToNull, genIdFromText, isNotEmpty } from "../../common/utils";
import { JobDTO } from "../../common/data/dto/jobDTO";
import { _getAllCompanyTagDTOByCompanyIds } from "./companyTagService";
import { _addOrUpdateConfig, _getConfigByKey } from "./configService";
import dayjs from "dayjs";
import { _getCompanyDTOByIds } from "./companyService";

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
            let companyIds = [];
            let companyIdMap = new Map();
            for (let i = 0; i < queryRows.length; i++) {
                let item = queryRows[i];
                let resultItem = new JobDTO();
                let keys = Object.keys(item);
                for (let n = 0; n < keys.length; n++) {
                    let key = keys[n];
                    resultItem[key] = item[key];
                }
                items.push(item);
                companyIdMap.set(genIdFromText(item.jobCompanyName))
            }
            companyIds.push(...Array.from(companyIdMap.keys()));
            let companyTagDTOList = await _getAllCompanyTagDTOByCompanyIds(companyIds);
            let companyIdAndCompanyTagListMap = new Map();
            companyTagDTOList.forEach(item => {
                let companyId = item.companyId;
                if (!companyIdAndCompanyTagListMap.has(companyId)) {
                    companyIdAndCompanyTagListMap.set(companyId, []);
                }
                companyIdAndCompanyTagListMap.get(companyId).push(item);
            });
            let companyDTOList = await _getCompanyDTOByIds(companyIds);
            let companyIdAndCompanyDTOListMap = new Map();
            companyDTOList.forEach(item => {
                let companyId = item.companyId;
                if (!companyIdAndCompanyDTOListMap.has(companyId)) {
                    companyIdAndCompanyDTOListMap.set(companyId, item);
                }
            });
            items.forEach(item => {
                item.companyTagDTOList = companyIdAndCompanyTagListMap.get(genIdFromText(item.jobCompanyName));
                item.companyDTO = companyIdAndCompanyDTOListMap.get(genIdFromText(item.jobCompanyName));
            });
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
    if (param.nameKeywordList && param.nameKeywordList.length > 0) {
        whereCondition += " AND (";
        param.nameKeywordList.forEach((item, index) => {
            if (index > 0) {
                whereCondition += " OR ";
            }
            whereCondition += " job_name LIKE '%" + item + "%' ";
        });
        whereCondition += " )";
    }
    if (param.salary) {
        whereCondition += ` AND job_salary_max >= ${param.salary}`;
    }
    if (param.addressKeywordList && param.addressKeywordList.length > 0) {
        whereCondition += " AND (";
        param.addressKeywordList.forEach((item, index) => {
            if (index > 0) {
                whereCondition += " OR ";
            }
            whereCondition += " job_address LIKE '%" + item + "%' ";
        });
        whereCondition += " )";
    }
    if (param.descKeywordList && param.descKeywordList.length > 0) {
        whereCondition += " AND (";
        param.descKeywordList.forEach((item, index) => {
            if (index > 0) {
                whereCondition += " OR ";
            }
            whereCondition += " job_description LIKE '%" + item + "%' ";
        });
        whereCondition += " )";
    }
    if (param.descDislikeKeywordList && param.descDislikeKeywordList.length > 0) {
        whereCondition += " AND (";
        param.descDislikeKeywordList.forEach((item, index) => {
            if (index > 0) {
                whereCondition += " AND ";
            }
            whereCondition += " job_description NOT LIKE '%" + item + "%' ";
        });
        whereCondition += " )";
    }
    if (param.bossPositionDislikeKeywordList && param.bossPositionDislikeKeywordList.length > 0) {
        whereCondition += " AND (";
        param.bossPositionDislikeKeywordList.forEach((item, index) => {
            if (index > 0) {
                whereCondition += " AND ";
            }
            whereCondition += " boss_position NOT LIKE '%" + item + "%' ";
        });
        whereCondition += " )";
    }
    if (param.publishDateOffset && param.publishDateOffset > 0) {
        let offsetDatetime = dayjs().subtract(param.publishDateOffset, "millisecond");
        whereCondition +=
            " AND job_first_publish_datetime >= '" +
            offsetDatetime.format("YYYY-MM-DD HH:mm:ss") +
            "'";
    }
    if (whereCondition.startsWith(" AND")) {
        whereCondition = whereCondition.replace("AND", "");
        whereCondition = " WHERE " + whereCondition;
    }
    whereCondition += ` GROUP BY t1.job_id `;
    return whereCondition;
}

function genSqlJobSearchQuery(param) {
    let joinSql = null;
    if (param.hasBrowseTime) {
        joinSql = `RIGHT JOIN (SELECT job_id AS _jobId,COUNT(job_id) AS browseDetailCount,MAX(job_visit_datetime) AS latestBrowseDetailDatetime FROM JOB_BROWSE_HISTORY WHERE job_visit_type = 'DETAIL' GROUP BY job_id) AS t2 ON t1.job_id = t2._jobId AND t2.browseDetailCount > 0`
    } else {
        joinSql = `LEFT JOIN (SELECT job_id AS _jobId,COUNT(job_id) AS browseDetailCount,MAX(job_visit_datetime) AS latestBrowseDetailDatetime FROM JOB_BROWSE_HISTORY WHERE job_visit_type = 'DETAIL' GROUP BY job_id) AS t2 ON t1.job_id = t2._jobId`;
        joinSql += ` LEFT JOIN company_tag AS t3 ON t1.job_company_name = t3.company_name`;
    }
    return `SELECT job_id AS jobId,job_platform AS jobPlatform,job_url AS jobUrl,job_name AS jobName,job_company_name AS jobCompanyName,job_location_name AS jobLocationName,job_address AS jobAddress,job_longitude AS jobLongitude,job_latitude AS jobLatitude,job_description AS jobDescription,job_degree_name AS jobDegreeName,job_year AS jobYear,job_salary_min AS jobSalaryMin,job_salary_max AS jobSalaryMax,job_salary_total_month AS jobSalaryTotalMonth,job_first_publish_datetime AS jobFirstPublishDatetime,boss_name AS bossName,boss_company_name AS bossCompanyName,boss_position AS bossPosition,t1.create_datetime AS createDatetime,t1.update_datetime AS updateDatetime,IFNULL(t2.browseDetailCount,0) AS browseDetailCount,t2.latestBrowseDetailDatetime AS latestBrowseDetailDatetime,GROUP_CONCAT(t3.tag_id) AS companyTagIdArray FROM job AS t1 ${joinSql}`;
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
