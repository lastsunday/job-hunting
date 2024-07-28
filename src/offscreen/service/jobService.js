import { Job } from "../../common/data/domain/job";
import { Message } from "../../common/api/message";
import dayjs from "dayjs";
import { JobDTO } from "../../common/data/dto/jobDTO";
import { toHump, convertEmptyStringToNull, genIdFromText, isNotEmpty } from "../../common/utils";
import { StatisticJobBrowseDTO } from "../../common/data/dto/statisticJobBrowseDTO";
import { StatisticJobSearchGroupByAvgSalaryDTO } from "../../common/data/dto/statisticJobSearchGroupByAvgSalaryDTO";
import { SearchJobBO } from "../../common/data/bo/searchJobBO";
import { SearchJobDTO } from "../../common/data/dto/searchJobDTO";
import { postSuccessMessage, postErrorMessage } from "../util";
import { getDb, getOne } from "../database";
import { _getAllCompanyTagDTOByCompanyIds } from "./companyTagService";
import { _getCompanyDTOByIds } from "./companyService";

const JOB_VISIT_TYPE_SEARCH = "SEARCH";
const JOB_VISIT_TYPE_DETAIL = "DETAIL";

export const JobService = {
  /**
   *
   * @param {Message} message
   * @param {Job[]} param
   */
  batchAddOrUpdateJobBrowse: async function (message, param) {
    try {
      const now = new Date();
      (await getDb()).exec({
        sql: "BEGIN TRANSACTION",
      });
      for (let i = 0; i < param.length; i++) {
        await insertOrUpdateJobAndBrowseHistory(param[i], now);
      }
      (await getDb()).exec({
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
   * @param {Job[]} param
   */
  batchAddOrUpdateJob: async function (message, param) {
    try {
      const now = new Date();
      (await getDb()).exec({
        sql: "BEGIN TRANSACTION",
      });
      for (let i = 0; i < param.length; i++) {
        await _insertOrUpdateJob(param[i], now);
      }
      (await getDb()).exec({
        sql: "COMMIT",
      });
      postSuccessMessage(message, {});
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] batchAddOrUpdateJob error : " + e.message
      );
    }
  },

  /**
   *
   * @param {Message} message
   * @param {Job} param
   */
  addOrUpdateJobBrowse: async function (message, param) {
    try {
      const now = new Date();
      (await getDb()).exec({
        sql: "BEGIN TRANSACTION",
      });
      insertOrUpdateJobAndBrowseHistory(param, now);
      (await getDb()).exec({
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
   * @param {string} param jobId
   */
  addJobBrowseDetailHistory: async function (message, param) {
    try {
      const now = new Date();
      await addJobBrowseHistory(param, now, JOB_VISIT_TYPE_DETAIL);
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
  getJobBrowseInfoByIds: async function (message, param) {
    try {
      let ids = "'" + param.join("','") + "'";
      let searchCountMap = await getJobBrowseHistoryCountMap(
        ids,
        JOB_VISIT_TYPE_SEARCH
      );
      let detailCountMap = await getJobBrowseHistoryCountMap(
        ids,
        JOB_VISIT_TYPE_DETAIL
      );
      let tempResultMap = new Map();
      const SQL_QUERY_JOB =
        "SELECT job_id,job_platform,job_url,job_name,job_company_name,job_location_name,job_address,job_longitude,job_latitude,job_description,job_degree_name,job_year,job_salary_min,job_salary_max,job_salary_total_month,job_first_publish_datetime,boss_name,boss_company_name,boss_position,create_datetime,update_datetime FROM job WHERE job_id in (" +
        ids +
        ")";
      let rows = [];
      (await getDb()).exec({
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
          target.browseCount = searchCountMap.get(jobId);
          target.browseDetailCount = detailCountMap.get(jobId);
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
  searchJob: async function (message, param) {
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
      postErrorMessage(message, "[worker] searchJob error : " + e.message);
    }
  },
  /**
   *
   * @param {Message} message
   * @param {string} param url
   *
   * @returns Job
   */
  getJobByDetailUrl: async function (message, param) {
    try {
      postSuccessMessage(
        message,
        await getOne(SQL_JOB_BY_JOB_URL, [param], new Job())
      );
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] getJobByDetailUrl error : " + e.message
      );
    }
  },

  /**
   *
   * @param {Message} message
   * @param {SearchJobBO} param
   *
   * @returns StatisticJobSearchGroupByAvgSalaryDTO
   */
  statisticJobSearchGroupByAvgSalary: async function (message, param) {
    try {
      let result = new StatisticJobSearchGroupByAvgSalaryDTO();
      let resultSqlQuery = SQL_GROUP_BY_COUNT_AVG_SALARY.replace(
        "#{injectSql}",
        genSqlJobSearchQuery(param) + genJobSearchWhereConditionSql(param)
      );
      let queryRows = [];
      (await getDb()).exec({
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
  statisticJobBrowse: async function (message, param) {
    try {
      let result = new StatisticJobBrowseDTO();
      let now = dayjs();
      let todayStart = now.startOf("day").format("YYYY-MM-DD HH:mm:ss");
      let todayEnd = now
        .startOf("day")
        .add(1, "day")
        .format("YYYY-MM-DD HH:mm:ss");
      const SQL_QUERY_JOB_BOWSE_HISTORY_COUNT_TODAY =
        "SELECT COUNT(*) AS count FROM job_browse_history WHERE job_visit_datetime >= $startDatetime AND job_visit_datetime < $endDatetime AND job_visit_type = $visitType";
      let browseCountToday = [];
      (await getDb()).exec({
        sql: SQL_QUERY_JOB_BOWSE_HISTORY_COUNT_TODAY,
        rowMode: "object",
        resultRows: browseCountToday,
        bind: {
          $startDatetime: todayStart,
          $endDatetime: todayEnd,
          $visitType: JOB_VISIT_TYPE_SEARCH
        },
      });
      let browseCountDetailToday = [];
      (await getDb()).exec({
        sql: SQL_QUERY_JOB_BOWSE_HISTORY_COUNT_TODAY,
        rowMode: "object",
        resultRows: browseCountDetailToday,
        bind: {
          $startDatetime: todayStart,
          $endDatetime: todayEnd,
          $visitType: JOB_VISIT_TYPE_DETAIL
        },
      });
      const SQL_QUERY_JOB_BOWSE_HISTORY_COUNT_TOTAL =
        "SELECT COUNT(*) AS count FROM job_browse_history WHERE job_visit_type = $visitType";
      let browseTotalCount = [];
      (await getDb()).exec({
        sql: SQL_QUERY_JOB_BOWSE_HISTORY_COUNT_TOTAL,
        rowMode: "object",
        resultRows: browseTotalCount,
        bind: {
          $visitType: JOB_VISIT_TYPE_SEARCH
        },
      });
      let browseTotalDetailCount = [];
      (await getDb()).exec({
        sql: SQL_QUERY_JOB_BOWSE_HISTORY_COUNT_TOTAL,
        rowMode: "object",
        resultRows: browseTotalDetailCount,
        bind: {
          $visitType: JOB_VISIT_TYPE_DETAIL
        },
      });
      const SQL_QUERY_JOB_COUNT_TOTAL = "SELECT COUNT(*) AS count FROM job;";
      let jobTotalCount = [];
      (await getDb()).exec({
        sql: SQL_QUERY_JOB_COUNT_TOTAL,
        rowMode: "object",
        resultRows: jobTotalCount,
      });
      result.todayBrowseCount = browseCountToday[0].count;
      result.totalBrowseCount = browseTotalCount[0].count;
      result.todayBrowseDetailCount = browseCountDetailToday[0].count;
      result.totalBrowseDetailCount = browseTotalDetailCount[0].count;
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

async function getJobBrowseHistoryCountMap(ids, type) {
  let countMap = new Map();
  const SQL_QUERY_JOB_BOWSE_HISTORY_GROUP_COUNT = `SELECT job_id AS jobId ,count(*) AS total FROM job_browse_history WHERE job_id IN (
    ${ids}
    ) AND job_visit_type = '${type}'  GROUP BY job_id;`;
  let countRows = [];
  (await getDb()).exec({
    sql: SQL_QUERY_JOB_BOWSE_HISTORY_GROUP_COUNT,
    rowMode: "object",
    resultRows: countRows,
  });
  for (let i = 0; i < countRows.length; i++) {
    let item = countRows[i];
    countMap.set(item.jobId, item.total);
  }
  return countMap;
}

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
  if (param.hasCoordinate) {
    whereCondition += ` AND job_longitude IS NOT NULL AND job_longitude <> '' AND  IS NOT NULL AND job_latitude <> ''`;
  }
  if (isNotEmpty(param.minLat) && isNotEmpty(param.maxLat)) {
    whereCondition += ` AND job_latitude >= ${param.minLat} AND job_latitude <= ${param.maxLat}`;
  }
  if (isNotEmpty(param.minLng) && isNotEmpty(param.maxLng)) {
    whereCondition += ` AND job_longitude >= ${param.minLng} AND job_longitude <= ${param.maxLng}`;
  }
  if (whereCondition.startsWith(" AND")) {
    whereCondition = whereCondition.replace("AND", "");
    whereCondition = " WHERE " + whereCondition;
  }
  return whereCondition;
}

async function insertOrUpdateJobAndBrowseHistory(param, now) {
  await _insertOrUpdateJob(param, now, { update: false });
  await addJobBrowseHistory(param.jobId, now, JOB_VISIT_TYPE_SEARCH);
}

async function _insertOrUpdateJob(param, now, { update = true } = {}) {
  let rows = [];
  const SQL_JOB_BY_ID = `SELECT job_id,job_platform,job_url,job_name,job_company_name,job_location_name,job_address,job_longitude,job_latitude,job_description,job_degree_name,job_year,job_salary_min,job_salary_max,job_salary_total_month,job_first_publish_datetime,boss_name,boss_company_name,boss_position,create_datetime,update_datetime FROM job WHERE job_id = ?`;
  (await getDb()).exec({
    sql: SQL_JOB_BY_ID,
    rowMode: "object",
    bind: [param.jobId],
    resultRows: rows,
  });
  if (rows.length > 0) {
    if (update) {
      if (!param.updateDatetime) {
        const SQL_UPDATE_JOB = `
    UPDATE job SET job_platform=$job_platform,job_url=$job_url,job_name=$job_name,job_company_name=$job_company_name,job_location_name=$job_location_name,job_address=$job_address,job_longitude=$job_longitude,job_latitude=$job_latitude,job_description=$job_description,job_degree_name=$job_degree_name,job_year=$job_year,job_salary_min=$job_salary_min,job_salary_max=$job_salary_max,job_salary_total_month=$job_salary_total_month,job_first_publish_datetime=$job_first_publish_datetime,boss_name=$boss_name,boss_company_name=$boss_company_name,boss_position=$boss_position,update_datetime=$update_datetime WHERE job_id = $job_id;
  `;
        (await getDb()).exec({
          sql: SQL_UPDATE_JOB,
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
            $update_datetime: dayjs(now).format("YYYY-MM-DD HH:mm:ss"),
          },
        });
      } else {
        let previousRowCreateDatetime = dayjs(rows[0].create_datetime);
        let previousRowUpdateDatetime = dayjs(rows[0].update_datetime);
        let currentRowCreateDatetime = dayjs(param.createDatetime);
        let currentRowUpdateDatetime = dayjs(param.updateDatetime);
        if (currentRowUpdateDatetime.isAfter(previousRowUpdateDatetime)) {
          const SQL_UPDATE_JOB = `
          UPDATE job SET job_platform=$job_platform,job_url=$job_url,job_name=$job_name,job_company_name=$job_company_name,job_location_name=$job_location_name,job_address=$job_address,job_longitude=$job_longitude,job_latitude=$job_latitude,job_description=$job_description,job_degree_name=$job_degree_name,job_year=$job_year,job_salary_min=$job_salary_min,job_salary_max=$job_salary_max,job_salary_total_month=$job_salary_total_month,job_first_publish_datetime=$job_first_publish_datetime,boss_name=$boss_name,boss_company_name=$boss_company_name,boss_position=$boss_position,update_datetime=$update_datetime WHERE job_id = $job_id;
        `;
          (await getDb()).exec({
            sql: SQL_UPDATE_JOB,
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
              $update_datetime: currentRowUpdateDatetime.format("YYYY-MM-DD HH:mm:ss"),
            },
          });
        }
        //获取职位最早出现的时间
        if (currentRowCreateDatetime.isBefore(previousRowCreateDatetime)) {
          const SQL_UPDATE_JOB = `
          UPDATE job SET create_datetime=$create_datetime WHERE job_id = $job_id;
        `;
          (await getDb()).exec({
            sql: SQL_UPDATE_JOB,
            bind: {
              $job_id: param.jobId,
              $create_datetime: currentRowCreateDatetime.format("YYYY-MM-DD HH:mm:ss"),
            },
          });
        }
      }
    }
  } else {
    const SQL_INSERT_JOB = `
    INSERT INTO job (job_id,job_platform,job_url,job_name,job_company_name,job_location_name,job_address,job_longitude,job_latitude,job_description,job_degree_name,job_year,job_salary_min,job_salary_max,job_salary_total_month,job_first_publish_datetime,boss_name,boss_company_name,boss_position,create_datetime,update_datetime) VALUES ($job_id,$job_platform,$job_url,$job_name,$job_company_name,$job_location_name,$job_address,$job_longitude,$job_latitude,$job_description,$job_degree_name,$job_year,$job_salary_min,$job_salary_max,$job_salary_total_month,$job_first_publish_datetime,$boss_name,$boss_company_name,$boss_position,$create_datetime,$update_datetime)
  `;
    (await getDb()).exec({
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
        $create_datetime: dayjs(param.createDatetime ?? now).format("YYYY-MM-DD HH:mm:ss"),
        $update_datetime: dayjs(param.updateDatetime ?? now).format("YYYY-MM-DD HH:mm:ss"),
      },
    });
  }
}

async function addJobBrowseHistory(jobId, date, type) {
  const SQL_INSERT_JOB_BROWSE_HISTORY = `
  INSERT INTO job_browse_history (job_id,job_visit_datetime,job_visit_type) VALUES ($job_id,$job_visit_datetime,$job_visit_type)
  `;
  return (await getDb()).exec({
    sql: SQL_INSERT_JOB_BROWSE_HISTORY,
    bind: {
      $job_id: jobId,
      $job_visit_datetime: dayjs(date).format("YYYY-MM-DD HH:mm:ss"),
      $job_visit_type: type,
    },
  });
}

function genSqlJobSearchQuery(param) {
  let joinSql = null;
  if (param.hasBrowseTime) {
    joinSql = `RIGHT JOIN (SELECT job_id AS _jobId,COUNT(job_id) AS browseDetailCount,MAX(job_visit_datetime) AS latestBrowseDetailDatetime FROM JOB_BROWSE_HISTORY WHERE job_visit_type = 'DETAIL' GROUP BY job_id) AS t2 ON t1.job_id = t2._jobId AND t2.browseDetailCount > 0`
  } else {
    joinSql = `LEFT JOIN (SELECT job_id AS _jobId,COUNT(job_id) AS browseDetailCount,MAX(job_visit_datetime) AS latestBrowseDetailDatetime FROM JOB_BROWSE_HISTORY WHERE job_visit_type = 'DETAIL' GROUP BY job_id) AS t2 ON t1.job_id = t2._jobId`;
  }
  return `SELECT job_id AS jobId,job_platform AS jobPlatform,job_url AS jobUrl,job_name AS jobName,job_company_name AS jobCompanyName,job_location_name AS jobLocationName,job_address AS jobAddress,job_longitude AS jobLongitude,job_latitude AS jobLatitude,job_description AS jobDescription,job_degree_name AS jobDegreeName,job_year AS jobYear,job_salary_min AS jobSalaryMin,job_salary_max AS jobSalaryMax,job_salary_total_month AS jobSalaryTotalMonth,job_first_publish_datetime AS jobFirstPublishDatetime,boss_name AS bossName,boss_company_name AS bossCompanyName,boss_position AS bossPosition,create_datetime AS createDatetime,update_datetime AS updateDatetime,IFNULL(t2.browseDetailCount,0) AS browseDetailCount,t2.latestBrowseDetailDatetime AS latestBrowseDetailDatetime FROM job AS t1 ${joinSql}`;
}

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
const SQL_JOB_BY_JOB_URL = `SELECT job_id,job_platform,job_url,job_name,job_company_name,job_location_name,job_address,job_longitude,job_latitude,job_description,job_degree_name,job_year,job_salary_min,job_salary_max,job_salary_total_month,job_first_publish_datetime,boss_name,boss_company_name,boss_position,create_datetime,update_datetime FROM job WHERE job_url = ?`;
