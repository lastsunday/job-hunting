import { ChangeLog } from "./changelog";
const SQL_CREATE_TABLE_JOB = `
  CREATE TABLE company (
    company_id VARCHAR(255) PRIMARY KEY,
    company_name VARCHAR(255) UNIQUE,
    company_desc TEXT,
    company_start_date TIMESTAMPTZ, 
    company_status VARCHAR(255),
    company_legal_person VARCHAR(255),
    company_unified_code VARCHAR(255),
    company_web_site TEXT,
    company_insurance_num INTEGER,
    company_self_risk INTEGER,
    company_union_risk INTEGER,
    company_address TEXT,
    company_scope TEXT,
    company_tax_no VARCHAR(255),
    company_industry VARCHAR(255),
    company_license_number VARCHAR(255),
    company_longitude NUMERIC(16,13),
    company_latitude NUMERIC(16,13),
    source_url TEXT,
    source_platform VARCHAR(255),
    source_record_id VARCHAR(255),
    source_refresh_datetime TIMESTAMPTZ,
    create_datetime TIMESTAMPTZ,
    update_datetime TIMESTAMPTZ
  )
  `;

export class ChangeLogV2 extends ChangeLog {
  getSqlList() {
    let sqlList = [SQL_CREATE_TABLE_JOB];
    return sqlList;
  }
}
