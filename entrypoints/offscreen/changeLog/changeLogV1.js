import { ChangeLog } from './changelog';
const SQL_CREATE_TABLE_JOB = `
  CREATE TABLE job(
    job_id VARCHAR(255) PRIMARY KEY,
    job_platform VARCHAR(255),
    job_url VARCHAR(255), 
    job_name VARCHAR(255),
    job_company_name VARCHAR(255),
    job_location_name VARCHAR(255),
    job_address VARCHAR(255),
    job_longitude NUMERIC(16,13),
    job_latitude NUMERIC(16,13),
    job_description TEXT,
    job_degree_name VARCHAR(255),
    job_year SMALLINT,
    job_salary_min NUMERIC(12,2),
    job_salary_max NUMERIC(12,2),
    job_salary_total_month SMALLINT,
    job_first_publish_datetime TIMESTAMPTZ,
    boss_name VARCHAR(255),
    boss_company_name  VARCHAR(255),
    boss_position VARCHAR(255),
    create_datetime TIMESTAMPTZ,
    update_datetime TIMESTAMPTZ
  )
  `;

const SQL_CREATE_TABLE_JOB_BROWSE_HISTORY = `
  CREATE TABLE job_browse_history(
    job_id VARCHAR(255),
    job_visit_datetime TIMESTAMPTZ,
    job_visit_type VARCHAR(255)
  )
  `;
export class ChangeLogV1 extends ChangeLog {
  getSqlList() {
    let sqlList = [SQL_CREATE_TABLE_JOB, SQL_CREATE_TABLE_JOB_BROWSE_HISTORY];
    return sqlList;
  }
}
