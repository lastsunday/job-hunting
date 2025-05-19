import { ChangeLog } from "./changelog";

const SQL_ALTER_TABLE_PARTNE_ADD_COLUMN = `
  ALTER TABLE data_share_partner ADD COLUMN enable BOOLEAN DEFAULT TRUE;
  ALTER TABLE data_share_partner ADD COLUMN config JSONB;
  `;

const SQL_CREATE_JOB_PUBLIC = `
CREATE TABLE job_public (
    id VARCHAR(255) PRIMARY KEY,
    job_id VARCHAR(255),
    source_type INTEGER DEFAULT 0,
    source TEXT,
    create_datetime TIMESTAMPTZ,
    update_datetime TIMESTAMPTZ
  )
  `;

export class ChangeLogV14 extends ChangeLog {
  getSqlList() {
    const sqlList = [SQL_ALTER_TABLE_PARTNE_ADD_COLUMN, SQL_CREATE_JOB_PUBLIC];
    return sqlList;
  }
}
