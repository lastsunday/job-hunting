import { ChangeLog } from "./changelog";
const SQL_CREATE_TABLE_TAG = `
CREATE TABLE tag (
    tag_id TEXT PRIMARY KEY,
    tag_name TEXT UNIQUE,
    create_datetime DATETIME,
    update_datetime DATETIME
  )
  `;
const SQL_CREATE_TABLE_COMPANY_TAG = `
CREATE TABLE company_tag (
    company_tag_id TEXT PRIMARY KEY,
    company_id TEXT,
    company_name TEXT,
    tag_id TEXT,
    seq NUMERIC,
    create_datetime DATETIME,
    update_datetime DATETIME
  )
  `;

export class ChangeLogV3 extends ChangeLog {
  getSqlList() {
    let sqlList = [SQL_CREATE_TABLE_TAG,SQL_CREATE_TABLE_COMPANY_TAG];
    return sqlList;
  }
}
