import { Message } from "@/common/api/message";
import { JobStatisticGroupByPublishDateBO, TYPE_ENUM_DAY, TYPE_ENUM_HOUR, TYPE_ENUM_MONTH, TYPE_ENUM_WEEK } from "@/common/data/bo/jobStatisticGroupByPublishDateBO";
import { JobStatisticJobCompanyTagGroupByCompanyBO } from "@/common/data/bo/jobStatisticJobCompanyTagGroupByCompanyBO";
import { JobStatisticJobCompanyTagGroupByPlatformBO } from "@/common/data/bo/jobStatisticJobCompanyTagGroupByPlatformBO";
import { JobTagBO } from "@/common/data/bo/jobTagBO";
import { SearchJobBO } from "@/common/data/bo/searchJobBO";
import { Job } from "@/common/data/domain/job";
import { JobBrowseHistory } from "@/common/data/domain/jobBrowseHistory";
import { JobDTO } from "@/common/data/dto/jobDTO";
import { SearchJobDTO } from "@/common/data/dto/searchJobDTO";
import { StatisticJobBrowseDTO } from "@/common/data/dto/statisticJobBrowseDTO";
import { StatisticJobSearchGroupByAvgSalaryDTO } from "@/common/data/dto/statisticJobSearchGroupByAvgSalaryDTO";
import { postErrorMessage, postSuccessMessage } from "@/common/extension/worker/util";
import { TAG_SOURCE_TYPE_PLATFORM } from "@/common/index";
import { getValidJobData } from "@/common/service/dataSyncService";
import { genIdFromText, isNotEmpty, toLine } from "@/common/utils";
import dayjs from "dayjs";
import { batchInsert, convertRows, getDb } from "../database";
import { BaseService } from "./baseService";
import { _getCompanyDTOByIds } from "./companyService";
import { _getAllCompanyTagDTOByCompanyIds } from "./companyTagService";
import { _getAllJobTagDTOByJobIds, _jobTagBatchAddOrUpdate } from "./jobTagService";

const JOB_VISIT_TYPE_SEARCH = "SEARCH";
const JOB_VISIT_TYPE_DETAIL = "DETAIL";

const SERVICE_INSTANCE = new BaseService("job", "job_id",
  () => {
    return new Job();
  },
  () => {
    return new SearchJobDTO();
  },
  null
);

export const JobService = {
  /**
   *
   * @param {Message} message
   * @param {Job[]} param
   */
  batchAddOrUpdateJobBrowse: async function (message, param) {
    try {
      await (await getDb()).transaction(async (tx) => {
        return await batchInsertOrUpdateJobAndBrowseHistory(param, { connection: tx });
      });
      postSuccessMessage(message, {});
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] batchAddOrUpdateJobBrowse error : " + e.message
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
      await (await getDb()).transaction(async (tx) => {
        await _batchAddOrUpdateJob({ param, connection: tx });
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
   * @param {string} param jobId
   */
  addJobBrowseDetailHistory: async function (message, param) {
    try {
      const now = new Date();
      await batchAddJobBrowseHistory([{ jobId: param }], now, JOB_VISIT_TYPE_DETAIL);
      postSuccessMessage(message, {});
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] addJobBrowseDetailHistory error : " + e.message
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
      let rows = await SERVICE_INSTANCE._getByIds(param);
      for (let i = 0; i < rows.length; i++) {
        let item = rows[i];
        tempResultMap.set(item.jobId, item);
      }
      let result = [];
      for (let j = 0; j < param.length; j++) {
        let jobId = param[j];
        let target = tempResultMap.get(jobId);
        if (target) {
          target.browseCount = searchCountMap.get(jobId) ?? 0;
          target.browseDetailCount = detailCountMap.get(jobId) ?? 0;
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
      postSuccessMessage(message, await _searchJob({ param }));
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
    SERVICE_INSTANCE.getOne(message, param, "job_url");
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
      const { rows: queryRows } = await (await getDb()).query(resultSqlQuery);
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
      const SQL_QUERY_JOB_BOWSE_HISTORY_COUNT =
        "SELECT COUNT(*) AS count FROM job_browse_history WHERE job_visit_datetime >= $1 AND job_visit_datetime < $2 AND job_visit_type = $3";
      const { rows: browseCountToday } = await (await getDb()).query(SQL_QUERY_JOB_BOWSE_HISTORY_COUNT, [todayStart, todayEnd, JOB_VISIT_TYPE_SEARCH]);
      const { rows: browseCountYesterday } = await (await getDb()).query(SQL_QUERY_JOB_BOWSE_HISTORY_COUNT, [yesterdayStart, yesterdayEnd, JOB_VISIT_TYPE_SEARCH]);
      const { rows: browseCountDetailToday } = await (await getDb()).query(SQL_QUERY_JOB_BOWSE_HISTORY_COUNT, [todayStart, todayEnd, JOB_VISIT_TYPE_DETAIL]);
      const { rows: browseCountDetailYesterday } = await (await getDb()).query(SQL_QUERY_JOB_BOWSE_HISTORY_COUNT, [yesterdayStart, yesterdayEnd, JOB_VISIT_TYPE_DETAIL]);

      const SQL_QUERY_JOB_BOWSE_HISTORY_COUNT_TOTAL = "SELECT COUNT(*) AS count FROM job_browse_history WHERE job_visit_type = $1";
      const { rows: browseTotalCount } = await (await getDb()).query(SQL_QUERY_JOB_BOWSE_HISTORY_COUNT_TOTAL, [JOB_VISIT_TYPE_SEARCH]);
      const { rows: browseTotalDetailCount } = await (await getDb()).query(SQL_QUERY_JOB_BOWSE_HISTORY_COUNT_TOTAL, [JOB_VISIT_TYPE_DETAIL]);

      const SQL_QUERY_JOB_COUNT = "SELECT COUNT(*) AS count FROM job WHERE create_datetime >= $1 AND create_datetime < $2;";
      const { rows: jobTodayCount } = await (await getDb()).query(SQL_QUERY_JOB_COUNT, [todayStart, todayEnd]);
      const { rows: jobYesterdayCount } = await (await getDb()).query(SQL_QUERY_JOB_COUNT, [yesterdayStart, yesterdayEnd]);

      const SQL_QUERY_JOB_COUNT_TOTAL = "SELECT COUNT(*) AS count FROM job;";
      const { rows: jobTotalCount } = await (await getDb()).query(SQL_QUERY_JOB_COUNT_TOTAL);

      result.todayBrowseCount = browseCountToday[0].count;
      result.yesterdayBrowseCount = browseCountYesterday[0].count;
      result.totalBrowseCount = browseTotalCount[0].count;
      result.todayBrowseDetailCount = browseCountDetailToday[0].count;
      result.yesterdayBrowseDetailCount = browseCountDetailYesterday[0].count;
      result.totalBrowseDetailCount = browseTotalDetailCount[0].count;
      result.todayJob = jobTodayCount[0].count;
      result.yesterdayJob = jobYesterdayCount[0].count;
      result.totalJob = jobTotalCount[0].count;
      postSuccessMessage(message, result);
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] statisticJobBrowse error : " + e.message
      );
    }
  },
  /**
   *
   * @param {Message} message
   * @param {string[]} param id
   */
  jobGetByIds: async function (message, param) {
    SERVICE_INSTANCE.getByIds(message, param);
  },

  /**
     *
     * @param {Message} message
     * @param {JobStatisticGroupByPublishDateBO} param
     */
  jobStatisticGroupByPublishDate: async function (message, param) {
    try {
      let sql = `SELECT TO_CHAR(job_first_publish_datetime,'${convertEnum(param.type)}') AS name,COUNT(*) AS total FROM job WHERE job_first_publish_datetime IS NOT NULL GROUP BY name;`;
      let result = await jobStatistic({ sql });
      postSuccessMessage(message, result);
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] jobStatisticGroupByPublishDate error : " + e.message
      );
    }
  },

  /**
   *
   * @param {Message} message
   * @param {*} param
   */
  jobStatisticGroupByPlatform: async function (message, param) {
    try {
      let sql = `SELECT job_platform AS name,COUNT(*) AS total FROM job GROUP BY name;`;
      let result = await jobStatistic({ sql });
      postSuccessMessage(message, result);
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] jobStatisticGroupByPlatform error : " + e.message
      );
    }
  },

  /**
   *
   * @param {Message} message
   * @param {JobStatisticJobCompanyTagGroupByPlatformBO} param
   */
  jobStatisticJobCompanyTagGroupByPlatform: async function (message, param) {
    try {
      let whereCondition = "";
      if (isNotEmpty(param.tagName)) {
        whereCondition += ` AND tag_id = '${genIdFromText(param.tagName)}'`;
      }
      if (whereCondition.startsWith(" AND")) {
        whereCondition = whereCondition.replace("AND", "");
        whereCondition = " WHERE " + whereCondition;
      }
      let sql = `select t1.job_platform AS name, COUNT(*) AS count from job t1 LEFT JOIN company_tag t2 ON t1.job_company_name = t2.company_name ${whereCondition} GROUP BY t1.job_platform ORDER BY count DESC`;
      let result = await jobStatistic({ sql });
      postSuccessMessage(message, result);
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] jobStatisticJobTagGroupByPlatform error : " + e.message
      );
    }
  },
  /**
   *
   * @param {Message} message
   * @param {JobStatisticJobCompanyTagGroupByCompanyBO} param
   */
  jobStatisticJobCompanyTagGroupByCompany: async function (message, param) {
    try {
      let limit = '';
      if (param.pageNum != null && param.pageSize != null) {
        let limitStart = (param.pageNum - 1) * param.pageSize;
        let limitEnd = param.pageSize;
        limit = " limit " + limitEnd + " OFFSET " + limitStart;
      }
      let whereCondition = "";
      if (isNotEmpty(param.tagName)) {
        whereCondition += ` AND tag_id = '${genIdFromText(param.tagName)}'`;
      }
      if (whereCondition.startsWith(" AND")) {
        whereCondition = whereCondition.replace("AND", "");
        whereCondition = " WHERE " + whereCondition;
      }
      let sql = `SELECT t1.job_company_name AS name, COUNT(*) AS count from job t1 LEFT JOIN company_tag t2 ON t1.job_company_name = t2.company_name ${whereCondition} GROUP BY t1.job_company_name ORDER BY count DESC ${limit}`;
      let items = await jobStatistic({ sql });
      const { rows: countRows } = await (await getDb()).query(`SELECT COUNT(*) AS count from job t1 LEFT JOIN company_tag t2 ON t1.job_company_name = t2.company_name ${whereCondition}`);
      postSuccessMessage(message, { items, total: countRows[0].count });
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] jobStatisticJobCompanyTagGroupByCompany error : " + e.message
      );
    }
  },
};

export const _searchJob = async ({ param = null, connection = null } = {}) => {
  connection ??= await getDb();
  let result = new SearchJobDTO();
  let sqlQuery = "";
  let whereCondition = genJobSearchWhereConditionSql(param);
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
  sqlQuery += genSqlJobSearchQuery(param);
  sqlQuery += whereCondition;
  let sqlQueryCountSubSql = sqlQuery;
  sqlQuery += orderBy;
  sqlQuery += limit;
  let items = [];
  let total = 0;
  const { rows } = await connection.query(sqlQuery);
  const queryRows = convertRows(rows);

  await _fillSearchResultExtraInfo(items, queryRows, { connection });
  //count
  let sqlCount = `SELECT COUNT(*) AS total from (${sqlQueryCountSubSql}) AS t1`;
  const { rows: queryCountRows } = await connection.query(sqlCount);
  total = queryCountRows[0].total;

  result.items = items;
  result.total = total;

  return result;
}


const convertEnum = (value) => {
  if (TYPE_ENUM_MONTH == value) {
    return "MM";
  } else if (TYPE_ENUM_WEEK == value) {
    return "ID";
  } else if (TYPE_ENUM_DAY == value) {
    return "DD";
  } else if (TYPE_ENUM_HOUR == value) {
    return "HH24";
  } else {
    throw `unknow type = ${value}`
  }
}

async function jobStatistic({ sql }) {
  const { rows } = await (await getDb()).query(sql);
  return rows;
}

export async function _jobGetByIds({ param = null, connection = null } = {}) {
  return SERVICE_INSTANCE._getByIds(param, { connection });
}

async function getJobBrowseHistoryCountMap(ids, type) {
  let countMap = new Map();
  const SQL_QUERY_JOB_BOWSE_HISTORY_GROUP_COUNT = `SELECT job_id AS jobId ,count(*) AS total FROM job_browse_history WHERE job_id IN (
    ${ids}
    ) AND job_visit_type = '${type}'  GROUP BY job_id;`;
  const { rows: countRows } = await (await getDb()).query(SQL_QUERY_JOB_BOWSE_HISTORY_GROUP_COUNT);
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
      dayjs(param.startDatetime).format() +
      "'";
  }
  if (param.endDatetime) {
    whereCondition +=
      " AND create_datetime < '" +
      dayjs(param.endDatetime).format() +
      "'";
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
  if (param.firstPublishStartDatetime) {
    whereCondition +=
      " AND job_first_publish_datetime >= '" +
      dayjs(param.firstPublishStartDatetime).format() +
      "'";
  }
  if (param.firstPublishEndDatetime) {
    whereCondition +=
      " AND job_first_publish_datetime < '" +
      dayjs(param.firstPublishEndDatetime).format() +
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

async function batchInsertOrUpdateJobAndBrowseHistory(jobs, { connection = null } = {}) {
  await _batchInsertOrUpdateJob(jobs, { connection });
  await batchAddJobBrowseHistory(jobs, new Date(), JOB_VISIT_TYPE_SEARCH, { connection });
  await _batchInsertJobTag(jobs, { connection });
}

/**
 * 
 * @param {Job} param 
 */
async function _batchInsertJobTag(jobs, { connection = null } = {}) {
  let jobTags = [];
  for (let i = 0; i < jobs.length; i++) {
    let job = jobs[i];
    let entity = new JobTagBO();
    entity.jobId = job.jobId;
    entity.sourceType = TAG_SOURCE_TYPE_PLATFORM;
    entity.source = job.jobPlatform;
    let tags = [];
    if (job.skillTag) {
      tags.push(...job.skillTag.split(",").filter(item => isNotEmpty(item)))
    }
    if (job.welfareTag) {
      tags.push(...job.welfareTag.split(",").filter(item => isNotEmpty(item)))
    }
    entity.tags = tags;
    jobTags.push(entity);
  }
  await _jobTagBatchAddOrUpdate(jobTags, false, { connection });
}

async function _batchInsertOrUpdateJob(jobs, { connection = null } = {}) {
  const jobIds = jobs.map(item => item.jobId);
  let oldJobs = await SERVICE_INSTANCE._getByIds(jobIds, { connection });
  const oldJobsIdMap = new Map(oldJobs.map((obj) => [obj.jobId, obj]));
  let needToUpdateJobs = [];
  jobs.map(newRecord => {
    let existsRecord = oldJobsIdMap.get(newRecord.jobId);
    if (existsRecord) {
      let addItem = getValidJobData(existsRecord, newRecord);
      if (addItem) {
        needToUpdateJobs.push(addItem);
      }
    } else {
      needToUpdateJobs.push(newRecord);
    }
  })
  await SERVICE_INSTANCE._batchAddOrUpdate(needToUpdateJobs, { overrideCreateDatetime: true, overrideUpdateDatetime: true, connection });
}

async function batchAddJobBrowseHistory(jobs, date, type, { connection = null } = {}) {
  let items = [];
  let datetime = dayjs(date).format();
  for (let i = 0; i < jobs.length; i++) {
    let job = jobs[i];
    items.push({
      jobId: job.jobId,
      jobVisitDatetime: datetime,
      jobVisitType: type,
    })
  }
  return await batchInsert(new JobBrowseHistory(), "job_browse_history", items, { connection });
}

function genSqlJobSearchQuery(param) {
  let joinSql = null;
  if (param.hasBrowseTime) {
    joinSql = `RIGHT JOIN (SELECT job_id AS _jobId,COUNT(job_id) AS browseDetailCount,MAX(job_visit_datetime) AS latestBrowseDetailDatetime FROM JOB_BROWSE_HISTORY WHERE job_visit_type = 'DETAIL' GROUP BY job_id) AS t2 ON t1.job_id = t2._jobId AND t2.browseDetailCount > 0`
  } else {
    joinSql = `LEFT JOIN (SELECT job_id AS _jobId,COUNT(job_id) AS browseDetailCount,MAX(job_visit_datetime) AS latestBrowseDetailDatetime FROM JOB_BROWSE_HISTORY WHERE job_visit_type = 'DETAIL' GROUP BY job_id) AS t2 ON t1.job_id = t2._jobId`;
  }
  return `SELECT job_id ,job_platform ,job_url,job_name,job_company_name,job_location_name,job_address,job_longitude,job_latitude,job_description,job_degree_name,job_year,job_salary_min,job_salary_max,job_salary_total_month,job_first_publish_datetime,boss_name,boss_company_name,boss_position,create_datetime,update_datetime,is_full_company_name,skill_tag,welfare_tag,COALESCE(t2.browseDetailCount,0) AS browse_count,t2.latestBrowseDetailDatetime AS latest_browse_detail_datetime FROM job AS t1 ${joinSql}`;
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
			(t0.job_salary_min + t0.job_salary_max)/ 2 AS avgsalary
		FROM
			(#{injectSql}) AS t0
		) AS t1 
     WHERE t1.avgsalary > 0
) AS t2
GROUP BY
	t2.levels;
`;

export async function _fillSearchResultExtraInfo(items, queryRows, { connection = null } = {}) {
  if (queryRows.length <= 0) {
    return;
  }
  let companyIds = [];
  let companyIdMap = new Map();
  let jobIds = [];
  let jobIdMap = new Map();
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
    jobIdMap.set(item.jobId);
  }
  companyIds.push(...Array.from(companyIdMap.keys()));
  jobIds.push(...Array.from(jobIdMap.keys()));
  let companyTagDTOList = await _getAllCompanyTagDTOByCompanyIds(companyIds, { connection });
  let companyIdAndCompanyTagListMap = new Map();
  companyTagDTOList.forEach(item => {
    let companyId = item.companyId;
    if (!companyIdAndCompanyTagListMap.has(companyId)) {
      companyIdAndCompanyTagListMap.set(companyId, []);
    }
    companyIdAndCompanyTagListMap.get(companyId).push(item);
  });
  let jobTagDTOList = await _getAllJobTagDTOByJobIds(jobIds, { connection });
  let jobIdAndJobTagListMap = new Map();
  jobTagDTOList.forEach(item => {
    let id = item.jobId;
    if (!jobIdAndJobTagListMap.has(id)) {
      jobIdAndJobTagListMap.set(id, []);
    }
    jobIdAndJobTagListMap.get(id).push(item);
  });
  let companyDTOList = await _getCompanyDTOByIds(companyIds, { connection });
  let companyIdAndCompanyDTOListMap = new Map();
  companyDTOList.forEach(item => {
    let companyId = item.companyId;
    if (!companyIdAndCompanyDTOListMap.has(companyId)) {
      companyIdAndCompanyDTOListMap.set(companyId, item);
    }
  });
  items.forEach(item => {
    item.companyTagDTOList = companyIdAndCompanyTagListMap.get(genIdFromText(item.jobCompanyName));
    item.jobTagDTOList = jobIdAndJobTagListMap.get(item.jobId);
    item.companyDTO = companyIdAndCompanyDTOListMap.get(genIdFromText(item.jobCompanyName));
    item.skillTagList = item.skillTag?.split(",") || [];
    item.welfareTagList = item.welfareTag?.split(",") || [];
  });
}

export const _batchAddOrUpdateJob = async ({ param = null, connection = null } = {}) => {
  await _batchInsertOrUpdateJob(param, { connection });
  return await _batchInsertJobTag(param, { connection });
}
