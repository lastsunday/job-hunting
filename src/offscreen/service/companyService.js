import { Message } from "../../common/api/message";
import { postSuccessMessage, postErrorMessage } from "../util";
import { getDb } from "../database";
import { Company } from "../../common/data/domain/company";
import { convertEmptyStringToNull, toHump } from "../../common/utils";
import dayjs from "dayjs";

export const CompanyService = {
  /**
   *
   * @param {Message} message
   * @param {string} param id
   *
   * @returns Company
   */
  getCompanyById: function (message, param) {
    try {
      let resultItem = null;
      let rows = [];
      getDb().exec({
        sql: SQL_SELECT_BY_ID,
        rowMode: "object",
        bind: [param],
        resultRows: rows,
      });
      if (rows.length > 0) {
        let item = rows[0];
        resultItem = new Company();
        let keys = Object.keys(item);
        for (let n = 0; n < keys.length; n++) {
          let key = keys[n];
          resultItem[toHump(key)] = item[key];
        }
      }
      postSuccessMessage(message, resultItem);
    } catch (e) {
      postErrorMessage(message, "[worker] getCompanyById error : " + e.message);
    }
  },

  /**
   *
   * @param {Message} message
   * @param {Company} param
   */
  addOrUpdateCompany: function (message, param) {
    try {
      const now = new Date();
      let rows = [];
      getDb().exec({
        sql: SQL_SELECT_BY_ID,
        rowMode: "object",
        bind: [param.companyId],
        resultRows: rows,
      });
      if (rows.length > 0) {
        getDb().exec({
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
        getDb().exec({
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
      postSuccessMessage(message, {});
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] addOrUpdateCompany error : " + e.message
      );
    }
  },
};

const SQL_SELECT_BY_ID = `SELECT company_id, company_name, company_desc, company_start_date, company_status, company_legal_person, company_unified_code, company_web_site, company_insurance_num, company_self_risk, company_union_risk, company_address, company_scope, company_tax_no, company_industry, company_license_number, company_longitude, company_latitude, source_url, source_platform, source_record_id, source_refresh_datetime, create_datetime, update_datetime FROM company WHERE company_id = ?`;
const SQL_INSERT_JOB = `
INSERT INTO company (company_id, company_name, company_desc, company_start_date, company_status, company_legal_person, company_unified_code, company_web_site, company_insurance_num, company_self_risk, company_union_risk, company_address, company_scope, company_tax_no, company_industry, company_license_number, company_longitude, company_latitude, source_url, source_platform, source_record_id, source_refresh_datetime, create_datetime, update_datetime) VALUES ($company_id,$company_name,$company_desc,$company_start_date,$company_status,$company_legal_person,$company_unified_code,$company_web_site,$company_insurance_num,$company_self_risk,$company_union_risk,$company_address,$company_scope,$company_tax_no,$company_industry,$company_license_number,$company_longitude,$company_latitude,$source_url,$source_platform,$source_record_id,$source_refresh_datetime,$create_datetime,$update_datetime)
`;
const SQL_UPDATE_JOB = `
UPDATE company SET company_name=$company_name, company_desc=$company_desc, company_start_date=$company_start_date, company_status=$company_status, company_legal_person=$company_legal_person, company_unified_code=$company_unified_code, company_web_site=$company_web_site, company_insurance_num=$company_insurance_num, company_self_risk=$company_self_risk, company_union_risk=$company_union_risk, company_address=$company_address, company_scope=$company_scope, company_tax_no=$company_tax_no, company_industry=$company_industry, company_license_number=$company_license_number, company_longitude=$company_longitude, company_latitude=$company_latitude, source_url=$source_url, source_platform=$source_platform, source_record_id=$source_record_id, source_refresh_datetime=$source_refresh_datetime, update_datetime=$update_datetime WHERE company_id = $company_id;
`;
