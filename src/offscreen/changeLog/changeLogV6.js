import { ChangeLog } from "./changelog";
const SQL_CREATE_TABLE_TASK_LIST = `
CREATE TABLE task (
    id TEXT PRIMARY KEY,
	type TEXT,
	data_id TEXT,
	status TEXT,
	error_reason TEXT,
	cost_time NUMERIC,
	retry_count NUMERIC,
    create_datetime DATETIME,
    update_datetime DATETIME
  )
  `;
const SQL_CREATE_TABLE_TASK_DATA_UPLOAD = `
  CREATE TABLE task_data_upload (
        id TEXT PRIMARY KEY,
        type TEXT,
        username TEXT,
        reponame TEXT,
        start_datetime DATETIME,
        end_datetime DATETIME,
        data_count NUMERIC,
        create_datetime DATETIME,
        update_datetime DATETIME
    )
    `;

const SQL_CREATE_TABLE_TASK_DATA_DOWNLOAD = `
    CREATE TABLE task_data_download (
          id TEXT PRIMARY KEY,
          type TEXT,
          username TEXT,
          reponame TEXT,
          datetime DATETIME,
          create_datetime DATETIME,
          update_datetime DATETIME
      )
      `;

const SQL_CREATE_TABLE_FILE = `
    CREATE TABLE file (
        id TEXT PRIMARY KEY,
        name TEXT,
        sha TEXT,
        encoding TEXT,
        content TEXT,
        size NUMERIC,
        type TEXT,
        create_datetime DATETIME,
        update_datetime DATETIME
    )
    `;

const SQL_CREATE_TABLE_MERGE = `
    CREATE TABLE task_data_merge (
        id TEXT PRIMARY KEY,
        type TEXT,
        username TEXT,
        reponame TEXT,
        datetime DATETIME,
        data_id TEXT,
        data_count NUMERIC,
        create_datetime DATETIME,
        update_datetime DATETIME
    )
    `;

const SQL_CREATE_TABLE_PARTNER = `
    CREATE TABLE data_share_partner (
        id TEXT PRIMARY KEY,
        username TEXT,
        reponame TEXT,
        repo_type TEXT,
        create_datetime DATETIME,
        update_datetime DATETIME
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
