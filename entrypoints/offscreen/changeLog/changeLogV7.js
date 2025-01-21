import { ChangeLog } from "./changelog";

const SQL_CREATE_TABLE_JOB_TAG = `
CREATE TABLE job_tag (
    id VARCHAR(255) PRIMARY KEY,
    job_id VARCHAR(255),
    tag_id VARCHAR(255),
    seq INTEGER,
    create_datetime TIMESTAMPTZ,
    update_datetime TIMESTAMPTZ
  )
  `;

export class ChangeLogV7 extends ChangeLog {
  getSqlList() {
    let sqlList = [SQL_CREATE_TABLE_JOB_TAG];
    return sqlList;
  }
}
