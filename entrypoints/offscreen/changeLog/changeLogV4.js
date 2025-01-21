import { ChangeLog } from "./changelog";
const SQL_CREATE_TABLE_CONFIG = `
CREATE TABLE config (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT,
    create_datetime TIMESTAMPTZ,
    update_datetime TIMESTAMPTZ
  )
  `;

export class ChangeLogV4 extends ChangeLog {
    getSqlList() {
        let sqlList = [SQL_CREATE_TABLE_CONFIG];
        return sqlList;
    }
}
