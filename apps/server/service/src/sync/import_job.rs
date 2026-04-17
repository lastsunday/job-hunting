use std::collections::{HashMap, HashSet};

use chrono::{DateTime, FixedOffset, TimeZone, Utc};
use entity::job::{ActiveModel as JobActiveModel, Entity as Job};
use entity::job_source::{
    ActiveModel as JobSourceActiveModel, Entity as JobSource, Model as JobSourceModel,
};

use crate::sync::error::ImportError;
use crate::sync::file_parser::{FileParser, JobHeaderMapping};
use crate::sync::types::ImportResult;
use crate::util::gen_sha256;
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, ConnectionTrait, DatabaseConnection, DbErr,
    EntityTrait, IntoActiveModel, QueryFilter, QuerySelect, TransactionTrait, TryIntoModel,
};

pub struct JobImporter;

impl JobImporter {
    const BATCH_SIZE: usize = 900;

    async fn batch_query_job_sources<C>(ids: Vec<String>, conn: &C) -> Result<Vec<JobSourceModel>, DbErr>
    where
        C: ConnectionTrait,
    {
        let mut results = Vec::new();
        for chunk in ids.chunks(Self::BATCH_SIZE) {
            let batch_results = JobSource::find()
                .filter(entity::job_source::Column::Id.is_in(chunk.to_vec()))
                .all(conn)
                .await?;
            results.extend(batch_results);
        }
        Ok(results)
    }

    async fn batch_query_jobs_locked<C>(
        ids: Vec<String>,
        conn: &C,
    ) -> Result<Vec<entity::job::Model>, DbErr>
    where
        C: ConnectionTrait,
    {
        let mut results = Vec::new();
        for chunk in ids.chunks(Self::BATCH_SIZE) {
            let batch_results = Job::find()
                .filter(entity::job::Column::Id.is_in(chunk.to_vec()))
                .lock(migration::LockType::Update)
                .all(conn)
                .await?;
            results.extend(batch_results);
        }
        Ok(results)
    }

    async fn batch_insert_job_sources<C>(
        sources: Vec<entity::job_source::ActiveModel>,
        conn: &C,
    ) -> Result<(), DbErr>
    where
        C: ConnectionTrait,
    {
        for chunk in sources.chunks(Self::BATCH_SIZE) {
            entity::job_source::Entity::insert_many(chunk.to_vec())
                .exec(conn)
                .await?;
        }
        Ok(())
    }

    async fn batch_insert_jobs<C>(
        jobs: Vec<entity::job::ActiveModel>,
        conn: &C,
    ) -> Result<(), DbErr>
    where
        C: ConnectionTrait,
    {
        for chunk in jobs.chunks(Self::BATCH_SIZE) {
            entity::job::Entity::insert_many(chunk.to_vec())
                .exec(conn)
                .await?;
        }
        Ok(())
    }

    pub async fn import(
        conn: &DatabaseConnection,
        data: Vec<Vec<String>>,
        uri: &str,
    ) -> Result<ImportResult, ImportError> {
        let start_time = std::time::Instant::now();

        // 空数据处理
        if data.is_empty() {
            return Ok(ImportResult {
                success: true,
                valid_result: true,
                data_version: 0,
                actual_version: 0,
                lack_columns: vec![],
                valid_columns: vec![],
                total: 0,
                imported: 0,
                updated: 0,
                cost_time: 0,
                errors: vec![],
                warnings: vec![],
            });
        }

        let headers = &data[0];

        // 验证表头
        let (valid, version, actual_version, lack_columns, warnings) =
            FileParser::validate_job_headers(headers);
        if !valid {
            return Ok(ImportResult {
                success: false,
                valid_result: false,
                data_version: version,
                actual_version,
                lack_columns: lack_columns.clone(),
                valid_columns: FileParser::get_job_valid_columns(actual_version),
                total: 0,
                imported: 0,
                updated: 0,
                cost_time: start_time.elapsed().as_millis() as i64,
                errors: vec!["职位文件缺少必填字段".to_string()],
                warnings,
            });
        }

        let mapping = FileParser::parse_job_headers(headers, actual_version);
        let rows = data[1..].to_vec();
        let total = rows.len();
        let now = Utc::now().with_timezone(&FixedOffset::west_opt(0).unwrap());

        // 使用闭包事务，自动处理提交/回滚
        let result = conn
            .transaction::<_, _, DbErr>(|txn| {
                let mapping = mapping.clone();
                let uri = uri.to_string();
                Box::pin(async move {
                    let mut job_ids_from_data: HashSet<String> = HashSet::new();
                    let mut job_source_map: HashMap<String, JobSourceActiveModel> = HashMap::new();

                    // 根据文件的rows构建job source列表
                    for row in &rows {
                        let job_id = Self::get_field_value(&mapping.job_id, row);
                        let job_source_id = Self::gen_job_source_id(job_id.as_str(), &uri);
                        job_ids_from_data.insert(job_source_id.clone());
                        job_source_map.insert(
                            job_source_id.clone(),
                            Self::build_job_source(
                                job_source_id.as_str(),
                                job_id.as_str(),
                                &mapping,
                                row,
                                &now,
                                &uri,
                            ).map_err(|e| DbErr::Query(sea_orm::RuntimeErr::Internal(e.to_string())))?,
                        );
                    }

                    // 根据data job_source id获取已存在数据中的job_source记录
                    let exists_job_source = Self::batch_query_job_sources(
                        job_ids_from_data.into_iter().collect(),
                        txn,
                    ).await?;

                    // 过滤数据库中的job_source记录
                    let exists_job_source_ids: Vec<String> = exists_job_source
                        .iter()
                        .map(|item| item.id.clone())
                        .collect();
                    for id in exists_job_source_ids {
                        job_source_map.remove(&id);
                    }

                    let filter_job_source: Vec<entity::job_source::ActiveModel> =
                        job_source_map.into_values().collect();

                    // 保存过滤后的job_source记录
                    Self::batch_insert_job_sources(filter_job_source.clone(), txn).await?;

                    let mut filter_job_id_and_job_source_map = HashMap::new();
                    let mut job_ids = Vec::new();

                    // 根据过滤后的job source更新或插入对应的job记录
                    for item in filter_job_source {
                        let model = item
                            .try_into_model()
                            .map_err(|e| DbErr::Query(sea_orm::RuntimeErr::Internal(e.to_string())))?;
                        let job_id = model.job_id.clone().ok_or_else(|| {
                            DbErr::Query(sea_orm::RuntimeErr::Internal("job_id is empty".to_string()))
                        })?;
                        filter_job_id_and_job_source_map.insert(job_id.clone(), model);
                        job_ids.push(job_id);
                    }

                    let exists_job = Self::batch_query_jobs_locked(job_ids, txn).await?;

                    let exists_job_id_model_map: HashMap<&str, &entity::job::Model> = exists_job
                        .iter()
                        .map(|item| (item.id.as_str(), item))
                        .collect();

                    let mut exists_job_source = Vec::new();
                    let mut not_exists_job_source = Vec::new();
                    for (id, job_source) in &filter_job_id_and_job_source_map {
                        if exists_job_id_model_map.contains_key(id.as_str()) {
                            exists_job_source.push(job_source);
                        } else {
                            not_exists_job_source.push(job_source);
                        }
                    }

                    let mut insert_job = Vec::new();

                    // 如果job不存在，则进行插入逻辑
                    for item in not_exists_job_source {
                        let job = Self::build_job(item, &now, &now)
                            .map_err(|e| DbErr::Query(sea_orm::RuntimeErr::Internal(e.to_string())))?;
                        insert_job.push(job);
                    }

                    let mut update_job_list = Vec::new();

                    // 如果job已存在，则进行更新处理逻辑
                    for item in exists_job_source {
                        let id = item.job_id.clone().ok_or_else(|| {
                            DbErr::Query(sea_orm::RuntimeErr::Internal("job_source job_id is empty".to_string()))
                        })?;
                        let job_source = item;
                        let job = exists_job_id_model_map
                            .get(id.as_str())
                            .ok_or_else(|| {
                                DbErr::Query(sea_orm::RuntimeErr::Internal("cant' get job model by id".to_string()))
                            })?;
                        let mut update_job = job
                            .to_owned()
                            .clone()
                            .try_into_model()
                            .map_err(|e| DbErr::Query(sea_orm::RuntimeErr::Internal(e.to_string())))?;

                        // 规则1: 更新的数据发布时间，如果job source列表的记录的publish datetime更加新，
                        // 那么job的所有字段（除公司名称，公司名是否为全称，首次扫描时间）需要更新
                        if update_job
                            .publish_datetime
                            .ok_or_else(|| {
                                DbErr::Query(sea_orm::RuntimeErr::Internal("job publish_datetime is empty".to_string()))
                            })?
                            < job_source
                                .publish_datetime
                                .ok_or_else(|| {
                                    DbErr::Query(sea_orm::RuntimeErr::Internal("job_source publish_datetime is empty".to_string()))
                                })?
                        {
                            update_job = Self::build_job(
                                &job_source,
                                &now,
                                &job.create_datetime.ok_or_else(|| {
                                    DbErr::Query(sea_orm::RuntimeErr::Internal("job create_datetime is empty".to_string()))
                                })?,
                            )
                            .map_err(|e| DbErr::Query(sea_orm::RuntimeErr::Internal(e.to_string())))?
                            .try_into_model()
                            .map_err(|e| DbErr::Query(sea_orm::RuntimeErr::Internal(e.to_string())))?;
                        }

                        // 规则2: 获得公司全称，如果原job的公司名称不是全称，而job source的是全称，那么更新
                        if !job
                            .is_full_company_name
                            .ok_or_else(|| {
                                DbErr::Query(sea_orm::RuntimeErr::Internal("job is_full_company_name is empty".to_string()))
                            })?
                            && job_source
                                .is_full_company_name
                                .ok_or_else(|| {
                                    DbErr::Query(sea_orm::RuntimeErr::Internal("job_source is_full_company_name is empty".to_string()))
                                })?
                        {
                            update_job.is_full_company_name = Some(true);
                            update_job.company_name = job_source.company_name.clone();
                        }

                        // 规则3: 更早的首次扫描时间，如果原job source的首次扫描时间比job的更早，
                        // 那么更新job source的首次扫描时间到job
                        if job_source
                            .first_scan_datetime
                            .ok_or_else(|| {
                                DbErr::Query(sea_orm::RuntimeErr::Internal("job_source first_scan_datetime is empty".to_string()))
                            })?
                            < job
                                .first_scan_datetime
                                .ok_or_else(|| {
                                    DbErr::Query(sea_orm::RuntimeErr::Internal("job first_scan_datetime is empty".to_string()))
                                })?
                        {
                            update_job.first_scan_datetime = job_source.first_scan_datetime;
                        } else {
                            update_job.first_scan_datetime = job.first_scan_datetime;
                        }

                        let active_model = update_job.into_active_model().reset_all();
                        update_job_list.push(active_model);
                    }

                    let imported = insert_job.len();
                    let updated = update_job_list.len();

                    // 批量插入新job
                    Self::batch_insert_jobs(insert_job, txn).await?;

                    // 更新已有job
                    for item in update_job_list {
                        item.update(txn).await?;
                    }

                    Ok(ImportResult {
                        success: true,
                        valid_result: true,
                        data_version: version,
                        actual_version,
                        lack_columns: vec![],
                        valid_columns: FileParser::get_job_valid_columns(actual_version),
                        total,
                        imported,
                        updated,
                        cost_time: start_time.elapsed().as_millis() as i64,
                        errors: vec![],
                        warnings,
                    })
                })
            })
            .await
            .map_err(|e| match e {
                sea_orm::TransactionError::Connection(db_err) => db_err,
                sea_orm::TransactionError::Transaction(db_err) => db_err,
            })?;

        Ok(result)
    }

    fn get_field_value(field_idx: &Option<usize>, row: &[String]) -> String {
        match field_idx {
            Some(idx) if *idx < row.len() => row[*idx].clone(),
            _ => String::new(),
        }
    }

    fn gen_job_source_id(job_id: &str, uri: &str) -> String {
        gen_sha256(format!("{}_{}", job_id, uri).as_str())
    }

    fn build_job_source(
        id: &str,
        job_id: &str,
        mapping: &JobHeaderMapping,
        row: &[String],
        now: &DateTime<FixedOffset>,
        uri: &str,
    ) -> Result<JobSourceActiveModel, Box<dyn std::error::Error>> {
        Ok(JobSourceActiveModel {
            id: ActiveValue::set(id.to_string()),
            job_id: ActiveValue::set(Some(job_id.to_string())),
            platform: ActiveValue::set(Some(Self::get_field_value(&mapping.platform, row))),
            url: ActiveValue::set(Some(Self::get_field_value(&mapping.url, row))),
            name: ActiveValue::set(Some(Self::get_field_value(&mapping.name, row))),
            company_name: ActiveValue::set(Some(Self::get_field_value(&mapping.company_name, row))),
            location_name: ActiveValue::set(Some(Self::get_field_value(
                &mapping.location_name,
                row,
            ))),
            address: ActiveValue::set(Some(Self::get_field_value(&mapping.address, row))),
            longitude: ActiveValue::set(Self::parse_f64(&Self::get_field_value(
                &mapping.longitude,
                row,
            ))),
            latitude: ActiveValue::set(Self::parse_f64(&Self::get_field_value(
                &mapping.latitude,
                row,
            ))),
            description: ActiveValue::set(Some(Self::get_field_value(&mapping.description, row))),
            degree_name: ActiveValue::set(Some(Self::get_field_value(&mapping.degree_name, row))),
            year: ActiveValue::set(Self::parse_int(&Self::get_field_value(&mapping.year, row))),
            salary_min: ActiveValue::set(Self::parse_float(&Self::get_field_value(
                &mapping.salary_min,
                row,
            ))),
            salary_max: ActiveValue::set(Self::parse_float(&Self::get_field_value(
                &mapping.salary_max,
                row,
            ))),
            salary_total_month: ActiveValue::set(Self::parse_int(&Self::get_field_value(
                &mapping.salary_total_month,
                row,
            ))),
            first_publish_datetime: {
                let text = Self::get_field_value(&mapping.first_publish_datetime, row);
                if text.is_empty() {
                    ActiveValue::set(None)
                } else {
                    ActiveValue::set(Some(Self::parse_datetime(text.as_str())?))
                }
            },
            boss_name: ActiveValue::set(Some(Self::get_field_value(&mapping.boss_name, row))),
            boss_company_name: ActiveValue::set(Some(Self::get_field_value(
                &mapping.boss_company_name,
                row,
            ))),
            boss_position: ActiveValue::set(Some(Self::get_field_value(
                &mapping.boss_position,
                row,
            ))),
            is_full_company_name: ActiveValue::set(Self::parse_bool(&Self::get_field_value(
                &mapping.is_full_company_name,
                row,
            ))),
            skill_tag: ActiveValue::set(Some(Self::get_field_value(&mapping.skill_tag, row))),
            welfare_tag: ActiveValue::set(Some(Self::get_field_value(&mapping.welfare_tag, row))),
            first_scan_datetime: ActiveValue::set(Some(Self::parse_datetime(
                Self::get_field_value(&mapping.create_datetime, row).as_str(),
            )?)),
            uri: ActiveValue::set(Some(uri.to_string())),
            publish_datetime: ActiveValue::set(Some(Self::parse_datetime(
                Self::get_field_value(&mapping.update_datetime, row).as_str(),
            )?)),
            create_datetime: ActiveValue::set(Some(*now)),
            update_datetime: ActiveValue::set(Some(*now)),
        })
    }

    fn build_job(
        source: &JobSourceModel,
        update_datetime: &DateTime<FixedOffset>,
        create_datetime: &DateTime<FixedOffset>,
    ) -> Result<JobActiveModel, Box<dyn std::error::Error>> {
        Ok(JobActiveModel {
            id: ActiveValue::set(
                source
                    .job_id
                    .clone()
                    .ok_or("job_source job_id is required")?,
            ),
            platform: ActiveValue::set(source.platform.clone()),
            url: ActiveValue::set(source.url.clone()),
            name: ActiveValue::set(source.name.clone()),
            company_name: ActiveValue::set(source.company_name.clone()),
            location_name: ActiveValue::set(source.location_name.clone()),
            address: ActiveValue::set(source.address.clone()),
            longitude: ActiveValue::set(source.longitude),
            latitude: ActiveValue::set(source.latitude),
            description: ActiveValue::set(source.description.clone()),
            degree_name: ActiveValue::set(source.degree_name.clone()),
            year: ActiveValue::set(source.year),
            salary_min: ActiveValue::set(source.salary_min),
            salary_max: ActiveValue::set(source.salary_max),
            salary_total_month: ActiveValue::set(source.salary_total_month),
            first_publish_datetime: ActiveValue::set(source.first_publish_datetime),
            boss_name: ActiveValue::set(source.boss_name.clone()),
            boss_company_name: ActiveValue::set(source.boss_company_name.clone()),
            boss_position: ActiveValue::set(source.boss_position.clone()),
            create_datetime: ActiveValue::set(Some(*create_datetime)),
            update_datetime: ActiveValue::set(Some(*update_datetime)),
            is_full_company_name: ActiveValue::set(source.is_full_company_name),
            skill_tag: ActiveValue::set(source.skill_tag.clone()),
            welfare_tag: ActiveValue::set(source.welfare_tag.clone()),
            first_scan_datetime: ActiveValue::set(source.first_scan_datetime),
            uri: ActiveValue::set(source.uri.clone()),
            publish_datetime: ActiveValue::set(source.publish_datetime),
        })
    }

    fn parse_float(s: &str) -> Option<f32> {
        s.trim().parse::<f32>().ok()
    }

    fn parse_f64(s: &str) -> Option<f64> {
        s.trim().parse::<f64>().ok()
    }

    fn parse_int(s: &str) -> Option<i32> {
        s.trim().parse::<i32>().ok()
    }

    fn parse_bool(s: &str) -> Option<bool> {
        match s.trim() {
            "是" | "true" | "1" => Some(true),
            "否" | "false" | "0" => Some(false),
            _ => None,
        }
    }

    fn parse_datetime(s: &str) -> Result<DateTime<FixedOffset>, Box<dyn std::error::Error>> {
        if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
            return Ok(dt);
        }
        let naive = chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S")?;
        let offset = FixedOffset::east_opt(0).unwrap();
        Ok(offset.from_utc_datetime(&naive))
    }
}
