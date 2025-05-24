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

const SQL_CREATE_COMPANY_COMMENT = `
CREATE TABLE company_comment (
    id VARCHAR(255) PRIMARY KEY,
    company_id VARCHAR(255),
    company_name VARCHAR(255),
    comment TEXT,
    emotion INTEGER,
    source_type INTEGER DEFAULT 0,
    source TEXT,
    source_data_name VARCHAR(255),
    create_datetime TIMESTAMPTZ,
    update_datetime TIMESTAMPTZ
  )
  `;

const SQL_CREATE_DATA_SOURCE_METADATA = `
CREATE TABLE data_source_metadata (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    icon VARCHAR(255),
    type VARCHAR(255),
    config JSONB,
    data JSONB,
    enable BOOLEAN DEFAULT TRUE,
    seq INTEGER,
    auto_update_enable BOOLEAN DEFAULT TRUE,
    create_datetime TIMESTAMPTZ,
    update_datetime TIMESTAMPTZ
  )
  `;

const SQL_DATA_DATA_SOURCE_METADATA = `
INSERT INTO data_source_metadata(id,name,description,icon,type,config,data,enable,seq,auto_update_enable,create_datetime,update_datetime) VALUES 
('0','公开数据','标准公开数据','i-material-symbols:public','GITHUB_GRAPHQL_SEARCH_REPO',
'{"repoName":"job-hunting-data","config":{"taskTypeList":["ALL_PUBLIC_DATA_DOWNLOAD"]}}',null,true,null,false,'2025-05-24 00:00:00','2025-05-24 00:00:00'),
('1','私有数据','标准私有数据','i-material-symbols:private-connectivity','GITHUB_GRAPHQL_SEARCH_REPO',
'{"repoName":"job-hunting-public-data","config":{"taskTypeList":["ALL_PRIVATE_DATA_DOWNLOAD"]}}',null,true,null,false,'2025-05-24 00:00:00','2025-05-24 00:00:00');
`

export class ChangeLogV14 extends ChangeLog {
  getSqlList() {
    const sqlList = [
      SQL_ALTER_TABLE_PARTNE_ADD_COLUMN,
      SQL_CREATE_JOB_PUBLIC,
      SQL_CREATE_COMPANY_COMMENT,
      SQL_CREATE_DATA_SOURCE_METADATA,
      SQL_DATA_DATA_SOURCE_METADATA,
    ];
    return sqlList;
  }
}
