import { ChangeLog } from "./changelog";
const SQL_CREATE_TABLE_TASK_LIST = `
CREATE TABLE task (
    id VARCHAR(255) PRIMARY KEY,
	type VARCHAR(255),
	data_id VARCHAR(255),
	status VARCHAR(255),
	error_reason TEXT,
	cost_time INTEGER,
	retry_count INTEGER,
    create_datetime TIMESTAMPTZ,
    update_datetime TIMESTAMPTZ
  )
  `;
const SQL_CREATE_TABLE_TASK_DATA_UPLOAD = `
  CREATE TABLE task_data_upload (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(255),
        username VARCHAR(255),
        reponame VARCHAR(255),
        start_datetime TIMESTAMPTZ,
        end_datetime TIMESTAMPTZ,
        data_count NUMERIC,
        create_datetime TIMESTAMPTZ,
        update_datetime TIMESTAMPTZ
    )
    `;

const SQL_CREATE_TABLE_TASK_DATA_DOWNLOAD = `
    CREATE TABLE task_data_download (
          id VARCHAR(255) PRIMARY KEY,
          type VARCHAR(255),
          username VARCHAR(255),
          reponame VARCHAR(255),
          datetime TIMESTAMPTZ,
          create_datetime TIMESTAMPTZ,
          update_datetime TIMESTAMPTZ
      )
      `;

const SQL_CREATE_TABLE_FILE = `
    CREATE TABLE file (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        sha VARCHAR(255),
        encoding VARCHAR(255),
        content TEXT,
        size BIGINT,
        type TEXT,
        create_datetime TIMESTAMPTZ,
        update_datetime TIMESTAMPTZ
    )
    `;

const SQL_CREATE_TABLE_MERGE = `
    CREATE TABLE task_data_merge (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(255),
        username VARCHAR(255),
        reponame VARCHAR(255),
        datetime TIMESTAMPTZ,
        data_id VARCHAR(255),
        data_count INTEGER,
        create_datetime TIMESTAMPTZ,
        update_datetime TIMESTAMPTZ
    )
    `;

const SQL_CREATE_TABLE_PARTNER = `
    CREATE TABLE data_share_partner (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255),
        reponame VARCHAR(255),
        repo_type VARCHAR(255),
        create_datetime TIMESTAMPTZ,
        update_datetime TIMESTAMPTZ
    )
    `;

const SQL_ALTER_TABLE_JOB_ADD_COLUMN_IS_FULL_COMPANY_NAME = `
    ALTER TABLE job ADD COLUMN is_full_company_name BOOLEAN
    `;

export class ChangeLogV6 extends ChangeLog {
    getSqlList() {
        let sqlList = [
            SQL_CREATE_TABLE_TASK_LIST,
            SQL_CREATE_TABLE_TASK_DATA_UPLOAD,
            SQL_CREATE_TABLE_TASK_DATA_DOWNLOAD,
            SQL_CREATE_TABLE_FILE,
            SQL_CREATE_TABLE_MERGE,
            SQL_ALTER_TABLE_JOB_ADD_COLUMN_IS_FULL_COMPANY_NAME,
            SQL_CREATE_TABLE_PARTNER];
        return sqlList;
    }
}
