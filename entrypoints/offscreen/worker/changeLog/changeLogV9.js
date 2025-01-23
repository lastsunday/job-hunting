import { ChangeLog } from "./changelog";

const SQL_ALTER_TABLE_COMPANY_TAG_ADD_COLUMN_SOURCE_TYPE = `
  ALTER TABLE company_tag ADD COLUMN source_type INTEGER DEFAULT 1
`;

const SQL_ALTER_TABLE_COMPANY_TAG_ADD_COLUMN_SOURCE = `
  ALTER TABLE company_tag ADD COLUMN source TEXT
`;

export class ChangeLogV9 extends ChangeLog {
  getSqlList() {
    let sqlList = [
      SQL_ALTER_TABLE_COMPANY_TAG_ADD_COLUMN_SOURCE_TYPE,
      SQL_ALTER_TABLE_COMPANY_TAG_ADD_COLUMN_SOURCE,
    ];
    return sqlList;
  }
}
