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
    icon TEXT,
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
('0','公开数据','标准公开数据','<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m-1-2.05V18q-.825 0-1.412-.587T9 16v-1l-4.8-4.8q-.075.45-.137.9T4 12q0 3.025 1.988 5.3T11 19.95m6.9-2.55q1.025-1.125 1.563-2.512T20 12q0-2.45-1.362-4.475T15 4.6V5q0 .825-.587 1.413T13 7h-2v2q0 .425-.288.713T10 10H8v2h6q.425 0 .713.288T15 13v3h1q.65 0 1.175.388T17.9 17.4"/></svg>','GITHUB_GRAPHQL_SEARCH_REPO',
'{"repoName":"job-hunting-public-data","config":{"taskTypeList":[{"type":"ALL_PUBLIC_DATA_DOWNLOAD"}]}}',null,true,1,false,'2025-05-24 00:00:00','2025-05-24 00:00:00'),
('1','私有数据','标准私有数据','<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 19q-2.65 0-4.612-1.713T5.075 13H2v-2h3.075q.35-2.575 2.313-4.288T12 5t4.613 1.713T18.925 11H22v2h-3.075q-.35 2.575-2.312 4.288T12 19m-3-3.5h6v-5h-1v-.9q0-.875-.575-1.487T12 7.5q-.825 0-1.412.588T10 9.5v1H9zm3-1.75q-.325 0-.537-.213T11.25 13t.213-.537t.537-.213t.538.213t.212.537t-.213.538t-.537.212m-1-3.25v-1q0-.425.288-.712T12 8.5t.713.288T13 9.5v1z"/></svg>','GITHUB_GRAPHQL_SEARCH_REPO',
'{"repoName":"job-hunting-data","config":{"taskTypeList":[{"type":"ALL_PRIVATE_DATA_DOWNLOAD"}]}}',null,true,2,false,'2025-05-24 00:00:00','2025-05-24 00:00:00'),
('2','预设数据源','预设数据源','<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g fill="currentColor"><path d="M9.818 8.561a11.9 11.9 0 0 0-2.814 2.109a13 13 0 0 0-.842.942a2.5 2.5 0 1 1 3.656-3.05m16.02 3.05q-.388-.48-.842-.942a11.9 11.9 0 0 0-2.814-2.109a2.5 2.5 0 1 1 3.656 3.051M12 13.969a1 1 0 0 0-1 1v1a1 1 0 0 0 2 0v-1a1 1 0 0 0-1-1m8 0a1 1 0 0 0-1 1v1a1 1 0 0 0 2 0v-1a1 1 0 0 0-1-1m-4.474 6.851l-1.014-.834a.715.715 0 0 1 .453-1.264h2.074a.713.713 0 0 1 .453 1.264l-1.013.833a.75.75 0 0 1-.953 0m.65 1.213a.498.498 0 0 0-.664.357c-.084.337-.196.745-.427 1.073c-.212.302-.526.538-1.085.538c-.654 0-1-.534-1-1a.5.5 0 0 0-1 0c0 .868.654 2 2 2c.925 0 1.528-.43 1.903-.962q.05-.073.097-.148q.045.076.097.148c.375.532.978.962 1.903.962c1.346 0 2-1.132 2-2a.5.5 0 0 0-1 0c0 .466-.346 1-1 1c-.56 0-.873-.236-1.085-.538c-.231-.328-.343-.736-.427-1.073a.5.5 0 0 0-.134-.242a.5.5 0 0 0-.178-.115"/><path d="M11.442 18.36A8.34 8.34 0 0 1 16 17a8.34 8.34 0 0 1 4.558 1.36A3.19 3.19 0 0 1 22 21.053v.74A6.113 6.113 0 0 1 16 28a6.113 6.113 0 0 1-6-6.207v-.74a3.19 3.19 0 0 1 1.442-2.693m8.571.84A7.35 7.35 0 0 0 16 18a7.34 7.34 0 0 0-4.012 1.198A2.21 2.21 0 0 0 11 21.053v.74A5.107 5.107 0 0 0 16 27a5.107 5.107 0 0 0 5-5.207v-.74a2.21 2.21 0 0 0-.987-1.853"/><path d="M6.369 28.753c.137.08 3.431 1.968 9.631 1.968c6.132 0 9.422-1.847 9.563-1.926l.003-.002a9.71 9.71 0 0 0 5.275-10.475a18.2 18.2 0 0 0-1.826-5.669A5.5 5.5 0 0 0 20.73 5.5a14.85 14.85 0 0 0-9.459 0a5.5 5.5 0 0 0-8.284 7.14a18 18 0 0 0-1.82 5.63A10 10 0 0 0 1 20.07a9.62 9.62 0 0 0 5.369 8.683M5.587 6.569A3.5 3.5 0 0 1 7.5 6a3.49 3.49 0 0 1 2.717 1.29a1 1 0 0 0 1.135.3a12.86 12.86 0 0 1 9.3 0a.99.99 0 0 0 1.134-.3a3.5 3.5 0 1 1 5.292 4.577a1 1 0 0 0-.129 1.177a16 16 0 0 1 1.918 5.6c.087.47.132.948.133 1.426a7.69 7.69 0 0 1-4.376 6.951c-.029.021-3.014 1.7-8.623 1.7c-5.556 0-8.537-1.647-8.682-1.727l-.003-.002A7.67 7.67 0 0 1 3 20.049q.005-.727.139-1.443a16 16 0 0 1 1.911-5.563a1 1 0 0 0-.129-1.177a3.5 3.5 0 0 1 .666-5.297"/></g></svg>','GIT_METADATA',
'{"config":{"url":"https://github.com/lastsunday/job-hunting-data-source","filePath":"metadata.json"}}',null,true,0,true,'2025-05-24 00:00:00','2025-05-24 00:00:00');
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
