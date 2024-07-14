import { ChangeLog } from "./changelog";
const SQL_CREATE_TABLE_CONFIG = `
CREATE TABLE config (
    key TEXT PRIMARY KEY,
    value TEXT,
    create_datetime DATETIME,
    update_datetime DATETIME
  )
  `;

export class ChangeLogV4 extends ChangeLog {
    getSqlList() {
        let sqlList = [SQL_CREATE_TABLE_CONFIG];
        return sqlList;
    }
}
