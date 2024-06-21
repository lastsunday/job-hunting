import { Job } from "../../common/data/domain/job";
import { Message } from "../../common/api/message";
import dayjs from "dayjs";
import { JobDTO } from "../../common/data/dto/jobDTO";
import { toHump, convertEmptyStringToNull } from "../../common/utils";
import { StatisticJobBrowseDTO } from "../../common/data/dto/statisticJobBrowseDTO";
import { StatisticJobSearchGroupByAvgSalaryDTO } from "../../common/data/dto/statisticJobSearchGroupByAvgSalaryDTO";
import { SearchJobBO } from "../../common/data/bo/searchJobBO";
import { SearchJobDTO } from "../../common/data/dto/searchJobDTO";
import { postSuccessMessage, postErrorMessage } from "../util";
import { getDb } from "../database";

export const JobService = {
  /**
   *
   * @param {Message} message
   * @param {Job[]} param
   */
  batchAddOrUpdateJobBrowse: function (message, param) {
    try {
      const now = new Date();
      getDb().exec({
        sql: "BEGIN TRANSACTION",
      });
      for (let i = 0; i < param.length; i++) {
        insertJobAndBrowseHistory(param[i], now);
      }
      getDb().exec({
        sql: "COMMIT",
      });
      postSuccessMessage(message, {});
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] addOrUpdateJobBrowse error : " + e.message
      );
    }
  },

  /**
   *
   * @param {Message} message
   * @param {Job} param
   */
  addOrUpdateJobBrowse: function (message, param) {
    try {
      const now = new Date();
      getDb().exec({
        sql: "BEGIN TRANSACTION",
      });
      insertJobAndBrowseHistory(param, now);
      getDb().exec({
        sql: "COMMIT",
      });
      postSuccessMessage(message, {});
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] addOrUpdateJobBrowse error : " + e.message
      );
    }
  },

  /**
   *
   * @param {*} message
   * @param {string[]} param
   *
   * @returns JobDTO[]
   */
  getJobBrowseInfoByIds: function (message, param) {
    try {
      let countMap = new Map();
      let ids = "'" + param.join("','") + "'";
      const SQL_QUERY_JOB_BOWSE_HISTORY_GROUP_COUNT =
        "SELECT job_id AS jobId ,count(*) AS total FROM job_browse_history WHERE job_id IN (" +
        ids +
        ") GROUP BY job_id;";
      let countRows = [];
      getDb().exec({
        sql: SQL_QUERY_JOB_BOWSE_HISTORY_GROUP_COUNT,
        rowMode: "object",
        resultRows: countRows,
      });
      for (let i = 0; i < countRows.length; i++) {
        let item = countRows[i];
        countMap.set(item.jobId, item.total);
      }
      let tempResultMap = new Map();
      const SQL_QUERY_JOB =
        "SELECT job_id,job_platform,job_url,job_name,job_company_name,job_location_name,job_address,job_longitude,job_latitude,job_description,job_degree_name,job_year,job_salary_min,job_salary_max,job_salary_total_month,job_first_publish_datetime,boss_name,boss_company_name,boss_position,create_datetime,update_datetime FROM job WHERE job_id in (" +
        ids +
        ")";
      let rows = [];
      getDb().exec({
        sql: SQL_QUERY_JOB,
        rowMode: "object",
        resultRows: rows,
      });
      for (let i = 0; i < rows.length; i++) {
        let item = rows[i];
        let resultItem = new JobDTO();
        let keys = Object.keys(item);
        for (let n = 0; n < keys.length; n++) {
          let key = keys[n];
          resultItem[toHump(key)] = item[key];
        }
        tempResultMap.set(resultItem.jobId, resultItem);
      }
      let result = [];
      for (let j = 0; j < param.length; j++) {
        let jobId = param[j];
        let target = tempResultMap.get(jobId);
        if (target) {
          target.browseCount = countMap.get(jobId);
        }
        result.push(target);
      }
      postSuccessMessage(message, result);
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] getJobBrowseInfoByIds error : " + e.message
      );
    }
  },

  /**
   *
   * @param {Message} message
   * @param {SearchJobBO} param
   *
   * @returns SearchJobDTO
   */
  searchJob: function (message, param) {
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
      sqlQuery += SQL_JOB_SEARCH_QUERY;
      sqlQuery += whereCondition;
      sqlQuery += orderBy;
      sqlQuery += limit;
      let items = [];
      let total = 0;
      let queryRows = [];
      getDb().exec({
        sql: sqlQuery,
        rowMode: "object",
        resultRows: queryRows,
      });

      for (let i = 0; i < queryRows.length; i++) {
        let item = queryRows[i];
        let resultItem = new JobDTO();
        let keys = Object.keys(item);
        for (let n = 0; n < keys.length; n++) {
          let key = keys[n];
          resultItem[key] = item[key];
        }
        items.push(item);
      }

      let sqlCount = "SELECT COUNT(*) AS total from job";
      //count
      sqlCount += whereCondition;
      let queryCountRows = [];
      getDb().exec({
        sql: sqlCount,
        rowMode: "object",
        resultRows: queryCountRows,
      });
      total = queryCountRows[0].total;

      result.items = items;
      result.total = total;
      postSuccessMessage(message, result);
    } catch (e) {
      postErrorMessage(message, "[worker] searchJob error : " + e.message);
    }
  },

  /**
   *
   * @param {Message} message
   * @param {SearchJobBO} param
   *
   * @returns StatisticJobSearchGroupByAvgSalaryDTO
   */
  statisticJobSearchGroupByAvgSalary: function (message, param) {
    try {
      let result = new StatisticJobSearchGroupByAvgSalaryDTO();
      let resultSqlQuery = SQL_GROUP_BY_COUNT_AVG_SALARY.replace(
        "#{injectSql}",
        SQL_JOB_SEARCH_QUERY + genJobSearchWhereConditionSql(param)
      );
      let queryRows = [];
      getDb().exec({
        sql: resultSqlQuery,
        rowMode: "object",
        resultRows: queryRows,
      });
      for (let i = 0; i < queryRows.length; i++) {
        let item = queryRows[i];
        result[item.levels] = item.total;
      }
      postSuccessMessage(message, result);
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] statisticJobSearchGroupByAvgSalary error : " + e.message
      );
    }
  },

  /**
   *
   * @param {Message} message
   * @param {*} param
   *
   * @returns {StatisticJobBrowseDTO}
   */
  statisticJobBrowse: function (message, param) {
    try {
      let result = new StatisticJobBrowseDTO();
      let now = dayjs();
      let todayStart = now.startOf("day").format("YYYY-MM-DD HH:mm:ss");
      let todayEnd = now
        .startOf("day")
        .add(1, "day")
        .format("YYYY-MM-DD HH:mm:ss");
      const SQL_QUERY_JOB_BOWSE_HISTORY_COUNT_TODAY =
        "SELECT COUNT(*) AS count FROM job_browse_history WHERE job_visit_datetime >= $startDatetime AND job_visit_datetime < $endDatetime";
      let browseCountToday = [];
      getDb().exec({
        sql: SQL_QUERY_JOB_BOWSE_HISTORY_COUNT_TODAY,
        rowMode: "object",
        resultRows: browseCountToday,
        bind: {
          $startDatetime: todayStart,
          $endDatetime: todayEnd,
        },
      });
      const SQL_QUERY_JOB_BOWSE_HISTORY_COUNT_TOTAL =
        "SELECT COUNT(*) AS count FROM job_browse_history";
      let browseTotalCount = [];
      getDb().exec({
        sql: SQL_QUERY_JOB_BOWSE_HISTORY_COUNT_TOTAL,
        rowMode: "object",
        resultRows: browseTotalCount,
      });
      const SQL_QUERY_JOB_COUNT_TOTAL = "SELECT COUNT(*) AS count FROM job;";
      let jobTotalCount = [];
      getDb().exec({
        sql: SQL_QUERY_JOB_COUNT_TOTAL,
        rowMode: "object",
        resultRows: jobTotalCount,
      });
      result.todayBrowseCount = browseCountToday[0].count;
      result.totalBrowseCount = browseTotalCount[0].count;
      result.totalJob = jobTotalCount[0].count;
      postSuccessMessage(message, result);
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] statisticJobBrowse error : " + e.message
      );
    }
  },
};

/**
 *
 * @param {SearchJobBO} param
 *
 * @returns string sql
 */
function genJobSearchWhereConditionSql(param) {
  let whereCondition = "";
  if (param.jobName) {
    whereCondition += " AND job_name LIKE '%" + param.jobName + "%' ";
  }
  if (param.jobCompanyName) {
    whereCondition +=
      " AND job_company_name LIKE '%" + param.jobCompanyName + "%' ";
  }
  if (param.jobLocationName) {
    whereCondition +=
      " AND job_location_name LIKE '%" + param.jobLocationName + "%' ";
  }
  if (param.jobAddress) {
    whereCondition += " AND job_address LIKE '%" + param.jobAddress + "%' ";
  }
  if (param.startDatetime) {
    whereCondition +=
      " AND create_datetime >= '" +
      dayjs(param.startDatetime).format("YYYY-MM-DD HH:mm:ss") +
      "'";
  }
  if (param.endDatetime) {
    whereCondition +=
      " AND create_datetime < '" +
      dayjs(param.endDatetime).format("YYYY-MM-DD HH:mm:ss") +
      "'";
  }
  if (param.firstPublishStartDatetime) {
    whereCondition +=
      " AND job_first_publish_datetime >= '" +
      dayjs(param.firstPublishStartDatetime).format("YYYY-MM-DD HH:mm:ss") +
      "'";
  }
  if (param.firstPublishEndDatetime) {
    whereCondition +=
      " AND job_first_publish_datetime < '" +
      dayjs(param.firstPublishEndDatetime).format("YYYY-MM-DD HH:mm:ss") +
      "'";
  }
  if (whereCondition.startsWith(" AND")) {
    whereCondition = whereCondition.replace("AND", "");
    whereCondition = " WHERE " + whereCondition;
  }
  return whereCondition;
}

function insertJobAndBrowseHistory(param, now) {
  let rows = [];
  const SQL_JOB_BY_ID = `SELECT job_id,job_platform,job_url,job_name,job_company_name,job_location_name,job_address,job_longitude,job_latitude,job_description,job_degree_name,job_year,job_salary_min,job_salary_max,job_salary_total_month,job_first_publish_datetime,boss_name,boss_company_name,boss_position,create_datetime,update_datetime FROM job WHERE job_id = ?`;
  getDb().exec({
    sql: SQL_JOB_BY_ID,
    rowMode: "object",
    bind: [param.jobId],
    resultRows: rows,
  });
  if (rows.length > 0) {
    //skip
  } else {
    const SQL_INSERT_JOB = `
    INSERT INTO job (job_id,job_platform,job_url,job_name,job_company_name,job_location_name,job_address,job_longitude,job_latitude,job_description,job_degree_name,job_year,job_salary_min,job_salary_max,job_salary_total_month,job_first_publish_datetime,boss_name,boss_company_name,boss_position,create_datetime,update_datetime) VALUES ($job_id,$job_platform,$job_url,$job_name,$job_company_name,$job_location_name,$job_address,$job_longitude,$job_latitude,$job_description,$job_degree_name,$job_year,$job_salary_min,$job_salary_max,$job_salary_total_month,$job_first_publish_datetime,$boss_name,$boss_company_name,$boss_position,$create_datetime,$update_datetime)
  `;
    getDb().exec({
      sql: SQL_INSERT_JOB,
      bind: {
        $job_id: param.jobId,
        $job_platform: param.jobPlatform,
        $job_url: convertEmptyStringToNull(param.jobUrl),
        $job_name: convertEmptyStringToNull(param.jobName),
        $job_company_name: convertEmptyStringToNull(param.jobCompanyName),
        $job_location_name: convertEmptyStringToNull(param.jobLocationName),
        $job_address: convertEmptyStringToNull(param.jobAddress),
        $job_longitude: convertEmptyStringToNull(param.jobLongitude),
        $job_latitude: convertEmptyStringToNull(param.jobLatitude),
        $job_description: convertEmptyStringToNull(param.jobDescription),
        $job_degree_name: convertEmptyStringToNull(param.jobDegreeName),
        $job_year: convertEmptyStringToNull(param.jobYear),
        $job_salary_min: convertEmptyStringToNull(param.jobSalaryMin),
        $job_salary_max: convertEmptyStringToNull(param.jobSalaryMax),
        $job_salary_total_month: convertEmptyStringToNull(
          param.jobSalaryTotalMonth
        ),
        $job_first_publish_datetime: dayjs(
          param.jobFirstPublishDatetime
        ).isValid()
          ? dayjs(param.jobFirstPublishDatetime).format("YYYY-MM-DD HH:mm:ss")
          : null,
        $boss_name: convertEmptyStringToNull(param.bossName),
        $boss_company_name: convertEmptyStringToNull(param.bossCompanyName),
        $boss_position: convertEmptyStringToNull(param.bossPosition),
        $create_datetime: dayjs(now).format("YYYY-MM-DD HH:mm:ss"),
        $update_datetime: dayjs(now).format("YYYY-MM-DD HH:mm:ss"),
      },
    });
  }
  const SQL_INSERT_JOB_BROWSE_HISTORY = `
  INSERT INTO job_browse_history (job_id,job_visit_datetime,job_visit_type) VALUES ($job_id,$job_visit_datetime,$job_visit_type)
  `;
  getDb().exec({
    sql: SQL_INSERT_JOB_BROWSE_HISTORY,
    bind: {
      $job_id: param.jobId,
      $job_visit_datetime: dayjs(now).format("YYYY-MM-DD HH:mm:ss"),
      $job_visit_type: "SEARCH",
    },
  });
}

const SQL_JOB_SEARCH_QUERY =
  "SELECT job_id AS jobId,job_platform AS jobPlatform,job_url AS jobUrl,job_name AS jobName,job_company_name AS jobCompanyName,job_location_name AS jobLocationName,job_address AS jobAddress,job_longitude AS jobLongitude,job_latitude AS jobLatitude,job_description AS jobDescription,job_degree_name AS jobDegreeName,job_year AS jobYear,job_salary_min AS jobSalaryMin,job_salary_max AS jobSalaryMax,job_salary_total_month AS jobSalaryTotalMonth,job_first_publish_datetime AS jobFirstPublishDatetime,boss_name AS bossName,boss_company_name AS bossCompanyName,boss_position AS bossPosition,create_datetime AS createDatetime,update_datetime AS updateDatetime FROM job";

const SQL_GROUP_BY_COUNT_AVG_SALARY = `
SELECT 
	t2.levels,
	COUNT(t2.levels) AS total
FROM
	(
	SELECT
		(CASE
			WHEN t1.avgsalary<3000 THEN '<3k'
			WHEN t1.avgsalary >= 3000
			AND t1.avgsalary<6000 THEN '3k-6k'
			WHEN t1.avgsalary >= 6000
			AND t1.avgsalary<9000 THEN '6k-9k'
			WHEN t1.avgsalary >= 9000
			AND t1.avgsalary<12000 THEN '9k-12k'
			WHEN t1.avgsalary >= 12000
			AND t1.avgsalary<15000 THEN '12k-15k'
			WHEN t1.avgsalary >= 15000
			AND t1.avgsalary<18000 THEN '15k-18k'
			WHEN t1.avgsalary >= 18000
			AND t1.avgsalary<21000 THEN '18k-21k'
			WHEN t1.avgsalary >= 21000
			AND t1.avgsalary<24000 THEN '21k-24k'
			ELSE '>24k'
		END) AS levels
	FROM
		(
		SELECT
			(t0.jobSalaryMin + t0.jobSalaryMax)/ 2 AS avgsalary
		FROM
			(#{injectSql}) AS t0
		where
			avgsalary > 0) AS t1
) AS t2
GROUP BY
	t2.levels;
`;
