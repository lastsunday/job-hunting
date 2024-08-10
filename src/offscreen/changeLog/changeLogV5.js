import { ChangeLog } from "./changelog";
const SQL_CREATE_TABLE_MISSION = `
CREATE TABLE mission (
    mission_id TEXT PRIMARY KEY,
    mission_name TEXT,
    mission_type TEXT,
    mission_platform TEXT,
    mission_config TEXT,
    seq NUMERIC,
    create_datetime DATETIME,
    update_datetime DATETIME
  )
  `;
const SQL_CREATE_TABLE_MISSION_LOG = `
  CREATE TABLE mission_log (
        mission_log_id TEXT,
        mission_id TEXT,
        mission_status TEXT,
        mission_status_reason TEXT,
        mission_log_detial TEXT,
        create_datetime DATETIME,
        update_datetime DATETIME
    )
    `;

export class ChangeLogV5 extends ChangeLog {
    getSqlList() {
        let sqlList = [SQL_CREATE_TABLE_MISSION, SQL_CREATE_TABLE_MISSION_LOG];
        return sqlList;
    }
}
