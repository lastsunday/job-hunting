import { ChangeLog } from "./changelog";

const SQL_CREATE_JOB_SNAPSHOT = `
CREATE TABLE job_snapshot (
    id VARCHAR(255) PRIMARY KEY,
    job_id VARCHAR(255),
    url TEXT,
    content TEXT,
    platform VARCHAR(255),
    create_datetime TIMESTAMPTZ,
    update_datetime TIMESTAMPTZ
  )
  `;

export class ChangeLogV12 extends ChangeLog {
  getSqlList() {
    const sqlList = [SQL_CREATE_JOB_SNAPSHOT];
    return sqlList;
  }
}
