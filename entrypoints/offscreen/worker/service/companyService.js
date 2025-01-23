import { Message } from "@/common/api/message";
import { CompanyBO } from "@/common/data/bo/companyBO";
import { SearchCompanyBO } from "@/common/data/bo/searchCompanyBO";
import { Company } from "@/common/data/domain/company";
import { ChartBasicDTO } from "@/common/data/dto/chartBasicDTO";
import { CompanyDTO } from "@/common/data/dto/companyDTO";
import { SearchCompanyDTO } from "@/common/data/dto/searchCompanyDTO";
import { StatisticCompanyDTO } from "@/common/data/dto/statisticCompanyDTO";
import { postErrorMessage, postSuccessMessage } from "@/common/extension/worker/util";
import { isNotEmpty, toHump, toLine } from "@/common/utils";
import dayjs from "dayjs";
import { convertRows, getDb } from "../database";
import { BaseService } from "./baseService";
import { _getAllCompanyTagDTOByCompanyIds } from "./companyTagService";

const SERVICE_INSTANCE = new BaseService("company", "company_id",
  () => {
    return new Company();
  },
  () => {
    return new SearchCompanyDTO();
  },
  null
);

export const CompanyService = {
  /**
   *
   * @param {Message} message
   * @param {string} param id
   *
   * @returns Company
   */
  getCompanyById: async function (message, param) {
    SERVICE_INSTANCE.getById(message, param);
  },
  /**
   *
   * @param {Message} message
   * @param {Company} param
   */
  addOrUpdateCompany: async function (message, param) {
    try {
      await SERVICE_INSTANCE._batchAddOrUpdate([param]);
      postSuccessMessage(message, {});
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] addOrUpdateCompany error : " + e.message
      );
    }
  },
  /**
     * 
     * @param {Message} message 
     * @param {CompanyBO[]} param 
     */
  batchAddOrUpdateCompany: async function (message, param) {
    try {
      await (await getDb()).transaction(async (tx) => {
        return await _batchAddOrUpdateCompany({ param, tx });
      });
      postSuccessMessage(message, {});
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] batchAddOrUpdateCompany error : " + e.message
      );
    }
  },
  /**
     * 
     * @param {Message} message 
     * @param {SearchCompanyBO} param 
     * 
     * @returns SearchCompanyDTO
     */
  searchCompany: async function (message, param) {
    try {
      postSuccessMessage(message, await _searchCompany({ param }));
    } catch (e) {
      postErrorMessage(message, "[worker] searchCompany error : " + e.message);
    }
  },

  /**
 *
 * @param {Message} message
 * @param {string[]} param ids
 *
 * @returns CompanyDTO[]
 */
  getCompanyDTOByIds: async function (message, param) {
    try {
      postSuccessMessage(message, await _getCompanyDTOByIds(param));
    } catch (e) {
      postErrorMessage(message, "[worker] getCompanyDTOByIds error : " + e.message);
    }
  },
  /**
  *
  * @param {Message} message
  * @param {*} param
  *
  * @returns {StatisticCompanyDTO}
  */
  statisticCompany: async function (message, param) {
    try {
      let result = new StatisticCompanyDTO();
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
      const { rows: todayAddQueryResult } = await (await getDb()).query(`SELECT COUNT(*) AS count FROM company WHERE create_datetime >= $1 AND create_datetime < $2`, [todayStart, todayEnd]);
      const { rows: yesterdayAddQueryResult } = await (await getDb()).query(`SELECT COUNT(*) AS count FROM company WHERE create_datetime >= $1 AND create_datetime < $2`, [yesterdayStart, yesterdayEnd]);
      const { rows: totalCompanyQueryResult } = await (await getDb()).query(`SELECT COUNT(*) AS count FROM company`);
      result.todayAddCount = todayAddQueryResult[0].count;
      result.yesterdayAddCount = yesterdayAddQueryResult[0].count;
      result.totalCompany = totalCompanyQueryResult[0].count;
      postSuccessMessage(message, result);
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] statisticCompany error : " + e.message
      );
    }
  },
  /**
   *
   * @param {Message} message
   * @param {string[]} param id
   */
  companyGetByIds: async function (message, param) {
    try {
      postSuccessMessage(message, await _companyGetByIds({ param }));
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] companyGetByIds error : " + e.message
      );
    }
  },

  /**
     *
     * @param {Message} message
     * @param {*} param
     */
  companyStatisticGroupByStartDate: async function (message, param) {
    try {
      let sql = `SELECT 
          t2.level AS name,
          COUNT(t2.level) AS total
        FROM
          (
          SELECT
            (CASE
              WHEN t1.offsetValue<1 THEN '<1'
              WHEN t1.offsetValue >= 1
              AND t1.offsetValue<3 THEN '1-3'
              WHEN t1.offsetValue >= 3
              AND t1.offsetValue<5 THEN '3-5'
              WHEN t1.offsetValue >= 5
              AND t1.offsetValue<10 THEN '5-10'
              WHEN t1.offsetValue >= 10
              AND t1.offsetValue<20 THEN '10-20'
              ELSE '>20'
            END) AS level
          FROM
            (
            SELECT
              date_part('year',now()) - date_part('year',company_start_date) AS offsetValue
            FROM
              company
            ) AS t1
        ) AS t2
        GROUP BY
          name;`;
      let result = await companyStatistic({ sql });
      postSuccessMessage(message, result);
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] companyStatisticGroupByStartDate error : " + e.message
      );
    }
  },

  /**
   * 统计社保人数
   * @param {Message} message
   * @param {*} param
   */
  companyStatisticGroupByInsurance: async function (message, param) {
    try {
      let sql = `SELECT 
          t2.level AS name,
          COUNT(t2.level) AS total
        FROM
          (
          SELECT
            (CASE
              WHEN t1.offsetValue IS NULL THEN '-'
              WHEN t1.offsetValue<10 THEN '<10'
              WHEN t1.offsetValue >= 10
              AND t1.offsetValue<20 THEN '10-20'
              WHEN t1.offsetValue >= 20
              AND t1.offsetValue<50 THEN '20-50'
              WHEN t1.offsetValue >= 50
              AND t1.offsetValue<100 THEN '50-100'
              WHEN t1.offsetValue >= 100
              AND t1.offsetValue<500 THEN '100-500'
              WHEN t1.offsetValue >= 500
              AND t1.offsetValue<1000 THEN '500-1000'
              ELSE '>1000'
            END) AS level
          FROM
            (
            SELECT
              company_insurance_num AS offsetValue
            FROM
              company
            ) AS t1
        ) AS t2
        GROUP BY
          name;
      `;
      let result = await companyStatistic({ sql });
      postSuccessMessage(message, result);
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] companyStatisticGroupByInsurance error : " + e.message
      );
    }
  },
};

export const _searchCompany = async ({ param = null, connection = null } = {}) => {
  connection ??= await getDb();
  let result = new SearchCompanyBO();
  let sqlQuery = "";
  let whereCondition = genSearchWhereConditionSql(param);
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
  const sqlSearchQuery = genSqlSearchQuery();
  sqlQuery += sqlSearchQuery;
  sqlQuery += whereCondition;
  sqlQuery += orderBy;
  sqlQuery += limit;
  let items = [];
  let total = 0;
  const { rows } = await connection.query(sqlQuery);
  const queryRows = convertRows(rows);
  for (let i = 0; i < queryRows.length; i++) {
    let item = queryRows[i];
    let resultItem = new CompanyDTO();
    let keys = Object.keys(item);
    for (let n = 0; n < keys.length; n++) {
      let key = keys[n];
      resultItem[toHump(key)] = item[key];
    }
    resultItem.tagNameArray = [];
    resultItem.tagIdArray = [];
    resultItem.companyTagList = [];
    items.push(resultItem);
  }
  let sqlCountSubTable = "";
  sqlCountSubTable += sqlSearchQuery;
  sqlCountSubTable += whereCondition;
  let ids = [];
  let itemIdObjectMap = new Map();
  if (items.length > 0) {
    items.forEach(item => {
      ids.push(item.companyId);
      itemIdObjectMap.set(item.companyId, item);
    });
    let companyTagDTOList = await _getAllCompanyTagDTOByCompanyIds(ids, { connection });
    companyTagDTOList.forEach(item => {
      itemIdObjectMap.get(item.companyId).tagNameArray.push(item.tagName);
      itemIdObjectMap.get(item.companyId).tagIdArray.push(item.tagId);
      itemIdObjectMap.get(item.companyId).companyTagList.push(item);
    });
  }
  //count
  let sqlCount = `SELECT COUNT(*) AS total FROM (${sqlCountSubTable}) AS t1`;
  const { rows: queryCountRows } = await connection.query(sqlCount);
  total = queryCountRows[0].total;
  result.items = items;
  result.total = total;
  return result;
}

async function companyStatistic({ sql }) {
  let result = [];
  const { rows: resultRows } = await (await getDb()).query(sql);
  resultRows.forEach(item => {
    result.push(Object.assign(new ChartBasicDTO(), item));
  });
  return result;
}

/**
 * 
 * @param {string[]} companyIds 
 * @returns CompanyDTO[]
 */
export async function _getCompanyDTOByIds(companyIds, { connection = null } = {}) {
  if (companyIds && companyIds.length == 0) {
    return [];
  }
  connection ??= await getDb();
  let items = [];
  let sqlQuery = "";
  let whereCondition = genIdsWhereConditionSql(companyIds);
  const sqlSearchQuery = genSqlSearchQuery();
  sqlQuery += sqlSearchQuery;
  sqlQuery += whereCondition;
  const { rows } = await connection.query(sqlQuery);
  const queryRows = convertRows(rows);
  for (let i = 0; i < queryRows.length; i++) {
    let item = queryRows[i];
    let resultItem = new CompanyDTO();
    let keys = Object.keys(item);
    for (let n = 0; n < keys.length; n++) {
      let key = keys[n];
      resultItem[toHump(key)] = item[key];
    }
    resultItem.tagNameArray = [];
    resultItem.tagIdArray = [];
    resultItem.companyTagList = [];
    items.push(resultItem);
  }
  let ids = [];
  let itemIdObjectMap = new Map();
  if (items.length > 0) {
    items.forEach(item => {
      ids.push(item.companyId);
      itemIdObjectMap.set(item.companyId, item);
    });
    let companyTagDTOList = await _getAllCompanyTagDTOByCompanyIds(ids, { connection });
    companyTagDTOList.forEach(item => {
      itemIdObjectMap.get(item.companyId).tagNameArray.push(item.tagName);
      itemIdObjectMap.get(item.companyId).tagIdArray.push(item.tagId);
      itemIdObjectMap.get(item.companyId).companyTagList.push(item);
    });
  }
  return items;
}

/**
 *
 * @param {SearchCompanyBO} param
 *
 * @returns string sql
 */
function genSearchWhereConditionSql(param) {
  let whereCondition = "";
  if (param.companyName) {
    whereCondition +=
      " AND company_name LIKE '%" + param.companyName + "%' ";
  }
  if (param.startDateStartDatetime) {
    whereCondition +=
      " AND company_start_date >= '" +
      dayjs(param.startDateStartDatetime).format() +
      "'";
  }
  if (param.startDateEndDatetime) {
    whereCondition +=
      " AND company_start_date < '" +
      dayjs(param.startDateEndDatetime).format() +
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
  if (isNotEmpty(param.minLat) && isNotEmpty(param.maxLat)) {
    whereCondition += ` AND company_latitude >= ${param.minLat} AND company_latitude <= ${param.maxLat}`;
  }
  if (isNotEmpty(param.minLng) && isNotEmpty(param.maxLng)) {
    whereCondition += ` AND company_longitude >= ${param.minLng} AND company_longitude <= ${param.maxLng}`;
  }
  if (whereCondition.startsWith(" AND")) {
    whereCondition = whereCondition.replace("AND", "");
    whereCondition = " WHERE " + whereCondition;
  }
  return whereCondition;
}

function genIdsWhereConditionSql(companyIds) {
  let ids = "'" + companyIds.join("','") + "'";
  let whereCondition = "";
  if (companyIds) {
    whereCondition += ` AND company_id IN (${ids})`;
  }
  if (whereCondition.startsWith(" AND")) {
    whereCondition = whereCondition.replace("AND", "");
    whereCondition = " WHERE " + whereCondition;
  }
  return whereCondition;
}

function genSqlSearchQuery() {
  return `SELECT company_id, company_name, company_desc, company_start_date, company_status, company_legal_person, company_unified_code, company_web_site, company_insurance_num, company_self_risk, company_union_risk, company_address, company_scope, company_tax_no, company_industry, company_license_number, company_longitude, company_latitude, source_url, source_platform, source_record_id, source_refresh_datetime, create_datetime, update_datetime FROM company`
}

export const _companyGetByIds = async ({ param = null, connection = null } = {}) => {
  return await SERVICE_INSTANCE._getByIds(param, { connection });
}

export const _batchAddOrUpdateCompany = async ({ param = null, connection = null } = {}) => {
  return await SERVICE_INSTANCE._batchAddOrUpdate(param, { connection, overrideCreateDatetime: true, overrideUpdateDatetime: true });
}