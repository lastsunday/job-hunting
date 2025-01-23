import { ChangeLog } from "./changelog";

const SQL_TABLE_INDEX = `
  CREATE INDEX i_job__job_url_index ON job(job_url);
  CREATE INDEX i_job__tag_job_id ON job_tag(job_id);
  CREATE INDEX i_job__job_first_publish_datetime ON job(job_first_publish_datetime);
  CREATE INDEX i_job__job_platform ON job(job_platform);
  CREATE INDEX i_job__job_company_name ON job(job_company_name);
  CREATE INDEX i_job__create_datetime ON job(create_datetime);
  CREATE INDEX i_job__update_datetime ON job(update_datetime);
  CREATE INDEX i_job__job_longitude ON job(job_longitude);
  CREATE INDEX i_job__job_latitude ON job(job_latitude);
  CREATE INDEX i_job_browse_history__job_id ON job_browse_history(job_id);
  CREATE INDEX i_job_browse_history__job_visit_datetime ON job_browse_history(job_visit_datetime);
  CREATE INDEX i_job_browse_history__job_visit_type ON job_browse_history(job_visit_type);
  CREATE INDEX i_company_tag__tag_id ON company_tag(tag_id);
  CREATE INDEX i_company_tag__company_id ON company_tag(company_id);
  CREATE INDEX i_company_tag__company_name ON company_tag(company_name);
  CREATE INDEX i_job_tag__job_id ON job_tag(job_id);
  CREATE INDEX i_job_tag__tag_id ON job_tag(tag_id);
`;

export class ChangeLogV11 extends ChangeLog {
    getSqlList() {
        let sqlList = [
          SQL_TABLE_INDEX
        ];
        return sqlList;
    }
}
