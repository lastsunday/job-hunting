import { expect, test } from "vitest";
import { getDb } from "@/entrypoints/offscreen/worker/database";
import { PGlite } from "@electric-sql/pglite";

test('database init correct', async () => {
  const expectTable = {
    version: { columns: ['num'] },
    job_browse_history: { columns: ['job_visit_datetime', 'job_id', 'job_visit_type'] },
    config: { columns: ['create_datetime', 'update_datetime', 'key', 'value'] },
    mission: {
      columns: [
        'seq',
        'create_datetime',
        'update_datetime',
        'mission_id',
        'mission_name',
        'mission_type',
        'mission_platform',
        'mission_config'
      ]
    },
    mission_log: {
      columns: [
        'create_datetime',
        'update_datetime',
        'mission_log_id',
        'mission_id',
        'mission_status',
        'mission_status_reason',
        'mission_log_detail'
      ]
    },
    task: {
      columns: [
        'cost_time',
        'retry_count',
        'create_datetime',
        'update_datetime',
        'id',
        'type',
        'data_id',
        'status',
        'error_reason'
      ]
    },
    task_data_upload: {
      columns: [
        'start_datetime',
        'end_datetime',
        'data_count',
        'create_datetime',
        'update_datetime',
        'id',
        'type',
        'username',
        'reponame'
      ]
    },
    task_data_download: {
      columns: [
        'datetime',
        'create_datetime',
        'update_datetime',
        'id',
        'type',
        'username',
        'reponame'
      ]
    },
    task_data_merge: {
      columns: [
        'datetime',
        'data_count',
        'create_datetime',
        'update_datetime',
        'id',
        'type',
        'username',
        'reponame',
        'data_id'
      ]
    },
    job: {
      columns: [
        'job_longitude',
        'job_latitude',
        'job_year',
        'job_salary_min',
        'job_salary_max',
        'job_salary_total_month',
        'job_first_publish_datetime',
        'create_datetime',
        'update_datetime',
        'is_full_company_name',
        'job_degree_name',
        'boss_name',
        'boss_company_name',
        'boss_position',
        'skill_tag',
        'welfare_tag',
        'job_id',
        'job_platform',
        'job_url',
        'job_name',
        'job_company_name',
        'job_location_name',
        'job_address',
        'job_description'
      ]
    },
    job_tag: {
      columns: [
        'seq',
        'create_datetime',
        'update_datetime',
        'source_type',
        'id',
        'job_id',
        'tag_id',
        'source'
      ]
    },
    tag: {
      columns: [
        'create_datetime',
        'update_datetime',
        'is_public',
        'tag_id',
        'tag_name'
      ]
    },
    company_tag: {
      columns: [
        'seq',
        'create_datetime',
        'update_datetime',
        'source_type',
        'company_tag_id',
        'company_id',
        'company_name',
        'tag_id',
        'source'
      ]
    },
    file: {
      columns: [
        'size',
        'create_datetime',
        'update_datetime',
        'is_delete',
        'id',
        'name',
        'sha',
        'encoding',
        'content',
        'type'
      ]
    },
    job_snapshot: {
      columns: [
        'create_datetime',
        'update_datetime',
        'content',
        'platform',
        'id',
        'job_id',
        'url'
      ]
    },
    company: {
      columns: [
        'company_start_date',
        'company_insurance_num',
        'company_self_risk',
        'company_union_risk',
        'company_longitude',
        'company_latitude',
        'source_refresh_datetime',
        'create_datetime',
        'update_datetime',
        'reg_capital_value',
        'paidin_capital_value',
        'source_platform',
        'source_record_id',
        'company_id',
        'company_name',
        'company_desc',
        'paidin_capital_currency',
        'company_status',
        'company_legal_person',
        'company_unified_code',
        'company_web_site',
        'company_address',
        'company_scope',
        'company_tax_no',
        'company_industry',
        'company_license_number',
        'reg_capital_currency',
        'source_url'
      ]
    },
    data_share_partner: {
      columns: [
        'create_datetime',
        'update_datetime',
        'enable',
        'config',
        'id',
        'username',
        'reponame',
        'repo_type'
      ]
    },
    job_public: {
      columns: [
        'id',
        'job_id',
        'source_type',
        'source',
        'create_datetime',
        'update_datetime'
      ]
    },
    company_comment:
    {
      columns: [
        'id',
        'company_id',
        'company_name',
        'comment',
        'emotion',
        'source_type',
        'source',
        'source_data_name',
        'create_datetime',
        'update_datetime'
      ]
    }
  }
  const db = await getDb({ dataDir: 'memory://' });
  expect(db).toBeInstanceOf(PGlite);
  const sql = `select tablename as name from pg_tables where schemaname = 'public'`;
  const { rows } = await db.query(sql);
  expect(rows).toHaveLength(Object.keys(expectTable).length);
  const tableNameArray = rows.map(item => item.name);
  const tableNameMap = new Map();
  tableNameArray.forEach(item => {
    tableNameMap.set(item, "");
  });
  Object.keys(expectTable).forEach(tableName => {
    expect(tableNameMap.has(tableName)).toBeTruthy();
  })
  const expectTableNameParam = Object.keys(expectTable).map(tableName => `'${tableName}'`).join(',');
  const sqlQueryTableAndColumn = `select table_name,column_name from information_schema.columns where table_name in (${expectTableNameParam})`;
  const { rows: tableAndNameRows } = await db.query(sqlQueryTableAndColumn);
  const convertdTableAndColumn = tableAndNameRows.reduce(
    (result, currentValue) => {
      (result[currentValue['table_name']] = result[currentValue['table_name']] || { columns: new Map() }).columns.set(currentValue['column_name'], "");
      return result;
    }, {});
  const expectTableKeys = Object.keys(expectTable);
  expectTableKeys.forEach(tableName => {
    const table = expectTable[tableName];
    const queryTable = convertdTableAndColumn[tableName]
    expect(queryTable).toBeTruthy();
    table.columns.forEach(columnName => {
      expect(queryTable.columns.has(columnName)).toBeTruthy();
    })
  })
})
