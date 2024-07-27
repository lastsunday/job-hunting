import { Message } from "../../common/api/message";
import { postSuccessMessage, postErrorMessage } from "../util";
import { getDb, getOne } from "../database";
import { Company } from "../../common/data/domain/company";
import { convertEmptyStringToNull, isNotEmpty } from "../../common/utils";
import dayjs from "dayjs";
import { SearchCompanyBO } from "../../common/data/bo/searchCompanyBO";
import { SearchCompanyDTO } from "../../common/data/dto/searchCompanyDTO";
import { CompanyDTO } from "../../common/data/dto/companyDTO";
import { StatisticCompanyDTO } from "../../common/data/dto/statisticCompanyDTO";
import { toHump, toLine } from "../../common/utils";
import { _getAllCompanyTagDTOByCompanyIds } from "./companyTagService";
import { CompanyBO } from "../../common/data/bo/companyBO";

export const CompanyService = {
  /**
   *
   * @param {Message} message
   * @param {string} param id
   *
   * @returns Company
   */
  getCompanyById: async function (message, param) {
    try {
      postSuccessMessage(
        message,
        await getOne(SQL_SELECT_BY_ID, [param], new Company())
      );
    } catch (e) {
      postErrorMessage(message, "[worker] getCompanyById error : " + e.message);
    }
  },

  /**
   *
   * @param {Message} message
   * @param {Company} param
   */
  addOrUpdateCompany: async function (message, param) {
    try {
      await _addOrUpdateCompany(param);
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
      (await getDb()).exec({
        sql: "BEGIN TRANSACTION",
      });
      for (let i = 0; i < param.length; i++) {
        await _addOrUpdateCompany(param[i]);
      }
      (await getDb()).exec({
        sql: "COMMIT",
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
      let result = new SearchCompanyBO();
      let sqlQuery = "";
      let whereCondition = genSearchWhereConditionSql(param);
      let orderBy =
        " ORDER BY " +
        toLine(param.orderByColumn) +
        " " +
        param.orderBy +
        " NULLS LAST";
      let limitStart = (param.pageNum - 1) * param.pageSize;
      let limitEnd = param.pageSize;
      let limit = " limit " + limitStart + "," + limitEnd;
      const sqlSearchQuery = genSqlSearchQuery();
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
        let resultItem = new CompanyDTO();
        let keys = Object.keys(item);
        for (let n = 0; n < keys.length; n++) {
          let key = keys[n];
          resultItem[toHump(key)] = item[key];
        }
        resultItem.tagNameArray = [];
        resultItem.tagIdArray = [];
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
        let companyTagDTOList = await _getAllCompanyTagDTOByCompanyIds(ids);
        companyTagDTOList.forEach(item => {
          itemIdObjectMap.get(item.companyId).tagNameArray.push(item.tagName);
          itemIdObjectMap.get(item.companyId).tagIdArray.push(item.tagId);
        });
      }
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
      let todayStart = now.startOf("day").format("YYYY-MM-DD HH:mm:ss");
      let todayEnd = now
        .startOf("day")
        .add(1, "day")
        .format("YYYY-MM-DD HH:mm:ss");
      let todayAddQueryResult = [];
      (await getDb()).exec({
        sql: `SELECT COUNT(*) AS count FROM company WHERE create_datetime >= $startDatetime AND create_datetime < $endDatetime`,
        rowMode: "object",
        resultRows: todayAddQueryResult,
        bind: {
          $startDatetime: todayStart,
          $endDatetime: todayEnd,
        }
      });
      let totalCompanyQueryResult = [];
      (await getDb()).exec({
        sql: `SELECT COUNT(*) AS count FROM company`,
        rowMode: "object",
        resultRows: totalCompanyQueryResult,
      });
      result.todayAddCount = todayAddQueryResult[0].count;
      result.totalCompany = totalCompanyQueryResult[0].count;
      postSuccessMessage(message, result);
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] statisticCompany error : " + e.message
      );
    }
  },
};

/**
 * 
 * @param {Company} param
 */
async function _addOrUpdateCompany(param) {
  const now = new Date();
  let rows = [];
  (await getDb()).exec({
    sql: SQL_SELECT_BY_ID,
    rowMode: "object",
    bind: [param.companyId],
    resultRows: rows,
  });
  if (rows.length > 0) {
    (await getDb()).exec({
      sql: SQL_UPDATE_JOB,
      bind: {
        $company_id: convertEmptyStringToNull(param.companyId),
        $company_name: convertEmptyStringToNull(param.companyName),
        $company_desc: convertEmptyStringToNull(param.companyDesc),
        $company_start_date: dayjs(param.companyStartDate).isValid()
          ? dayjs(param.companyStartDate).format("YYYY-MM-DD HH:mm:ss")
          : null,
        $company_status: convertEmptyStringToNull(param.companyStatus),
        $company_legal_person: convertEmptyStringToNull(
          param.companyLegalPerson
        ),
        $company_unified_code: convertEmptyStringToNull(
          param.companyUnifiedCode
        ),
        $company_web_site: convertEmptyStringToNull(param.companyWebSite),
        $company_insurance_num: convertEmptyStringToNull(
          param.companyInsuranceNum
        ),
        $company_self_risk: convertEmptyStringToNull(param.companySelfRisk),
        $company_union_risk: convertEmptyStringToNull(
          param.companyUnionRisk
        ),
        $company_address: convertEmptyStringToNull(param.companyAddress),
        $company_scope: convertEmptyStringToNull(param.companyScope),
        $company_tax_no: convertEmptyStringToNull(param.companyTaxNo),
        $company_industry: convertEmptyStringToNull(param.companyIndustry),
        $company_license_number: convertEmptyStringToNull(
          param.companyLicenseNumber
        ),
        $company_longitude: convertEmptyStringToNull(
          param.companyLongitude
        ),
        $company_latitude: convertEmptyStringToNull(param.companyLatitude),
        $source_url: convertEmptyStringToNull(param.sourceUrl),
        $source_platform: convertEmptyStringToNull(param.sourcePlatform),
        $source_record_id: convertEmptyStringToNull(param.sourceRecordId),
        $source_refresh_datetime: dayjs(
          param.sourceRefreshDatetime
        ).isValid()
          ? dayjs(param.sourceRefreshDatetime).format("YYYY-MM-DD HH:mm:ss")
          : null,
        $update_datetime: dayjs(now).format("YYYY-MM-DD HH:mm:ss"),
      },
    });
  } else {
    (await getDb()).exec({
      sql: SQL_INSERT_JOB,
      bind: {
        $company_id: convertEmptyStringToNull(param.companyId),
        $company_name: convertEmptyStringToNull(param.companyName),
        $company_desc: convertEmptyStringToNull(param.companyDesc),
        $company_start_date: dayjs(param.companyStartDate).isValid()
          ? dayjs(param.companyStartDate).format("YYYY-MM-DD HH:mm:ss")
          : null,
        $company_status: convertEmptyStringToNull(param.companyStatus),
        $company_legal_person: convertEmptyStringToNull(
          param.companyLegalPerson
        ),
        $company_unified_code: convertEmptyStringToNull(
          param.companyUnifiedCode
        ),
        $company_web_site: convertEmptyStringToNull(param.companyWebSite),
        $company_insurance_num: convertEmptyStringToNull(
          param.companyInsuranceNum
        ),
        $company_self_risk: convertEmptyStringToNull(param.companySelfRisk),
        $company_union_risk: convertEmptyStringToNull(
          param.companyUnionRisk
        ),
        $company_address: convertEmptyStringToNull(param.companyAddress),
        $company_scope: convertEmptyStringToNull(param.companyScope),
        $company_tax_no: convertEmptyStringToNull(param.companyTaxNo),
        $company_industry: convertEmptyStringToNull(param.companyIndustry),
        $company_license_number: convertEmptyStringToNull(
          param.companyLicenseNumber
        ),
        $company_longitude: convertEmptyStringToNull(
          param.companyLongitude
        ),
        $company_latitude: convertEmptyStringToNull(param.companyLatitude),
        $source_url: convertEmptyStringToNull(param.sourceUrl),
        $source_platform: convertEmptyStringToNull(param.sourcePlatform),
        $source_record_id: convertEmptyStringToNull(param.sourceRecordId),
        $source_refresh_datetime: dayjs(
          param.sourceRefreshDatetime
        ).isValid()
          ? dayjs(param.sourceRefreshDatetime).format("YYYY-MM-DD HH:mm:ss")
          : null,
        $create_datetime: dayjs(now).format("YYYY-MM-DD HH:mm:ss"),
        $update_datetime: dayjs(now).format("YYYY-MM-DD HH:mm:ss"),
      },
    });
  }
}


/**
 * 
 * @param {string[]} companyIds 
 * @returns CompanyDTO[]
 */
export async function _getCompanyDTOByIds(companyIds) {
  if (companyIds && companyIds.length == 0) {
    return [];
  }
  let items = [];
  let sqlQuery = "";
  let whereCondition = genIdsWhereConditionSql(companyIds);
  const sqlSearchQuery = genSqlSearchQuery();
  sqlQuery += sqlSearchQuery;
  sqlQuery += whereCondition;
  let queryRows = [];
  (await getDb()).exec({
    sql: sqlQuery,
    rowMode: "object",
    resultRows: queryRows,
  });
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
    items.push(resultItem);
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
      dayjs(param.startDateStartDatetime).format("YYYY-MM-DD HH:mm:ss") +
      "'";
  }
  if (param.startDateEndDatetime) {
    whereCondition +=
      " AND company_start_date < '" +
      dayjs(param.startDateEndDatetime).format("YYYY-MM-DD HH:mm:ss") +
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
  return `
  SELECT company_id, company_name, company_desc, company_start_date, company_status, company_legal_person, company_unified_code, company_web_site, company_insurance_num, company_self_risk, company_union_risk, company_address, company_scope, company_tax_no, company_industry, company_license_number, company_longitude, company_latitude, source_url, source_platform, source_record_id, source_refresh_datetime, create_datetime, update_datetime FROM company
  `
}

const SQL_SELECT_BY_ID = `SELECT company_id, company_name, company_desc, company_start_date, company_status, company_legal_person, company_unified_code, company_web_site, company_insurance_num, company_self_risk, company_union_risk, company_address, company_scope, company_tax_no, company_industry, company_license_number, company_longitude, company_latitude, source_url, source_platform, source_record_id, source_refresh_datetime, create_datetime, update_datetime FROM company WHERE company_id = ?`;
const SQL_INSERT_JOB = `
INSERT INTO company (company_id, company_name, company_desc, company_start_date, company_status, company_legal_person, company_unified_code, company_web_site, company_insurance_num, company_self_risk, company_union_risk, company_address, company_scope, company_tax_no, company_industry, company_license_number, company_longitude, company_latitude, source_url, source_platform, source_record_id, source_refresh_datetime, create_datetime, update_datetime) VALUES ($company_id,$company_name,$company_desc,$company_start_date,$company_status,$company_legal_person,$company_unified_code,$company_web_site,$company_insurance_num,$company_self_risk,$company_union_risk,$company_address,$company_scope,$company_tax_no,$company_industry,$company_license_number,$company_longitude,$company_latitude,$source_url,$source_platform,$source_record_id,$source_refresh_datetime,$create_datetime,$update_datetime)
`;
const SQL_UPDATE_JOB = `
UPDATE company SET company_name=$company_name, company_desc=$company_desc, company_start_date=$company_start_date, company_status=$company_status, company_legal_person=$company_legal_person, company_unified_code=$company_unified_code, company_web_site=$company_web_site, company_insurance_num=$company_insurance_num, company_self_risk=$company_self_risk, company_union_risk=$company_union_risk, company_address=$company_address, company_scope=$company_scope, company_tax_no=$company_tax_no, company_industry=$company_industry, company_license_number=$company_license_number, company_longitude=$company_longitude, company_latitude=$company_latitude, source_url=$source_url, source_platform=$source_platform, source_record_id=$source_record_id, source_refresh_datetime=$source_refresh_datetime, update_datetime=$update_datetime WHERE company_id = $company_id;
`;