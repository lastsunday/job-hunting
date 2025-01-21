import { ChangeLog } from "./changelog";

const SQL_ALTER_TABLE_JOB_ADD_COLUMN_SKILL_TAG = `
ALTER TABLE job ADD COLUMN skill_tag TEXT
`;

const SQL_ALTER_TABLE_JOB_ADD_COLUMN_WELFARE_TAG = `
  ALTER TABLE job ADD COLUMN welfare_tag TEXT
`;

const SQL_ALTER_TABLE_JOB_TAG_ADD_COLUMN_SOURCE_TYPE = `
  ALTER TABLE job_tag ADD COLUMN source_type INTEGER DEFAULT 0
`;

const SQL_ALTER_TABLE_JOB_TAG_ADD_COLUMN_SOURCE = `
  ALTER TABLE job_tag ADD COLUMN source TEXT
`;

const SQL_ALTER_TABLE_TAG_ADD_COLUMN_IS_PUBLIC = `
  ALTER TABLE tag ADD COLUMN is_public BOOLEAN DEFAULT TRUE
`;

const SQL_TAG_PRIVATE = `
INSERT INTO tag (tag_id, tag_name, create_datetime, update_datetime, is_public) VALUES ('9fb198689d6a5df526e27bfeea3d6d4d49033bb5ce47d2a2d04291d414fb1c54', '离家近', '2024-12-17 00:00:00', '2024-12-17 00:00:00',FALSE);
INSERT INTO tag (tag_id, tag_name, create_datetime, update_datetime, is_public) VALUES ('7e095c8afe0fbe1d6c44a267a1fcfd135f97fb4710d386c1f9d9dbe7983f76cf', '面试过', '2024-12-17 00:00:00', '2024-12-17 00:00:00',FALSE);
INSERT INTO tag (tag_id, tag_name, create_datetime, update_datetime, is_public) VALUES ('6256bf58984773e5e2d52b0ac7e7f726dd9e7c547e6f3f144354655608746760', '看过', '2024-12-17 00:00:00', '2024-12-17 00:00:00',FALSE);
INSERT INTO tag (tag_id, tag_name, create_datetime, update_datetime, is_public) VALUES ('60a53514eb9228a2cee1e6914eb36819fd13716e5df64eb5e9dd1868ebda5a0b', '收藏', '2024-12-17 00:00:00', '2024-12-17 00:00:00',FALSE);
`;


export class ChangeLogV8 extends ChangeLog {
  getSqlList() {
    let sqlList = [SQL_ALTER_TABLE_JOB_ADD_COLUMN_SKILL_TAG,
      SQL_ALTER_TABLE_JOB_ADD_COLUMN_WELFARE_TAG,
      SQL_ALTER_TABLE_JOB_TAG_ADD_COLUMN_SOURCE_TYPE,
      SQL_ALTER_TABLE_JOB_TAG_ADD_COLUMN_SOURCE,
      SQL_ALTER_TABLE_TAG_ADD_COLUMN_IS_PUBLIC,
      SQL_TAG_PRIVATE,
    ];
    return sqlList;
  }
}
