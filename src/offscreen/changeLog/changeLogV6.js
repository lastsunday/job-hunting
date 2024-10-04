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

export class ChangeLogV6 extends ChangeLog {
    getSqlList() {
        let sqlList = [SQL_CREATE_TABLE_TASK_LIST, SQL_CREATE_TABLE_TASK_DATA_UPLOAD];
        return sqlList;
    }
}
