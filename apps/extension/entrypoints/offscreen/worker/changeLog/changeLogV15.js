import { ChangeLog } from './changelog';

const SQL_ALTER_TABLE_TASK_ADD_COLUMN = `
  ALTER TABLE task_data_download ADD COLUMN data_id VARCHAR(255);
  ALTER TABLE task_data_upload ADD COLUMN data_page_num INTEGER;
  ALTER TABLE task_data_upload ADD COLUMN data_page_size INTEGER;
  ALTER TABLE task_data_download ADD COLUMN seq INTEGER;
  ALTER TABLE task_data_merge ADD COLUMN data_page_num INTEGER;
  ALTER TABLE task_data_merge ADD COLUMN data_page_size INTEGER;
  `;

export class ChangeLogV15 extends ChangeLog {
  getSqlList() {
    const sqlList = [SQL_ALTER_TABLE_TASK_ADD_COLUMN];
    return sqlList;
  }
}
