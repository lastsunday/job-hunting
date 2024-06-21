import { ChangeLog } from "./changelog";
const SQL_CREATE_TABLE_JOB = `
  CREATE TABLE company (
    company_id TEXT PRIMARY KEY,
    company_name TEXT UNIQUE,
    company_desc TEXT,
    company_start_date DATETIME, 
    company_status TEXT,
    company_legal_person TEXT,
    company_unified_code TEXT,
    company_web_site TEXT,
    company_insurance_num NUMERIC,
    company_self_risk NUMERIC,
    company_union_risk NUMERIC,
    company_address TEXT,
    company_scope TEXT,
    company_tax_no TEXT,
    company_industry TEXT,
    company_license_number TEXT,
    company_longitude NUMERIC,
    company_latitude NUMERIC,
    source_url TEXT,
    source_platform TEXT,
    source_record_id TEXT,
    source_refresh_datetime DATETIME,
    create_datetime DATETIME,
    update_datetime DATETIME
  )
  `;

export class ChangeLogV2 extends ChangeLog {
  getSqlList() {
    let sqlList = [SQL_CREATE_TABLE_JOB];
    return sqlList;
  }
}
