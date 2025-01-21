import { ChangeLog } from "./changelog";
const SQL_CREATE_TABLE_MISSION = `
CREATE TABLE mission (
    mission_id VARCHAR(255) PRIMARY KEY,
    mission_name VARCHAR(255),
    mission_type VARCHAR(255),
    mission_platform VARCHAR(255),
    mission_config TEXT,
    seq INTEGER,
    create_datetime TIMESTAMPTZ,
    update_datetime TIMESTAMPTZ
  )
  `;
const SQL_CREATE_TABLE_MISSION_LOG = `
  CREATE TABLE mission_log (
        mission_log_id VARCHAR(255) PRIMARY KEY,
        mission_id VARCHAR(255),
        mission_status VARCHAR(255),
        mission_status_reason TEXT,
        mission_log_detail TEXT,
        create_datetime TIMESTAMPTZ,
        update_datetime TIMESTAMPTZ
    )
    `;

export class ChangeLogV5 extends ChangeLog {
    getSqlList() {
        let sqlList = [SQL_CREATE_TABLE_MISSION, SQL_CREATE_TABLE_MISSION_LOG];
        return sqlList;
    }
}
