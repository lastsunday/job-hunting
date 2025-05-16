
import { ChangeLog } from "./changelog";

const SQL_ALTER_TABLE_PARTNE_ADD_COLUMN = `
  ALTER TABLE data_share_partner ADD COLUMN enable BOOLEAN DEFAULT TRUE;
  ALTER TABLE data_share_partner ADD COLUMN config JSONB;
  `;

export class ChangeLogV14 extends ChangeLog {
  getSqlList() {
    const sqlList = [SQL_ALTER_TABLE_PARTNE_ADD_COLUMN];
    return sqlList;
  }
}
