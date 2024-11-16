import { ChangeLog } from "./changelog";

const SQL_CREATE_TABLE_JOB_TAG = `
CREATE TABLE job_tag (
    id TEXT PRIMARY KEY,
    job_id TEXT,
    tag_id TEXT,
    seq NUMERIC,
    create_datetime DATETIME,
    update_datetime DATETIME
  )
  `;

export class ChangeLogV7 extends ChangeLog {
  getSqlList() {
    let sqlList = [SQL_CREATE_TABLE_JOB_TAG];
    return sqlList;
  }
}
