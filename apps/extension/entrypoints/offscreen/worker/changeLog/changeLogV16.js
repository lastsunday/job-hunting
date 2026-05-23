import { ChangeLog } from './changelog';

const SQL_DELETE_RECORD = `
  DELETE FROM data_source_metadata WHERE id = '0'  
  `;

export class ChangeLogV16 extends ChangeLog {
  getSqlList() {
    const sqlList = [SQL_DELETE_RECORD];
    return sqlList;
  }
}
