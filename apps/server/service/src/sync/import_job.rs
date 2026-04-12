use std::collections::HashSet;

use sea_orm::{
    DatabaseConnection, EntityTrait, ActiveValue, ActiveModelBehavior,
    QueryFilter, ColumnTrait,
};
use chrono::{DateTime, FixedOffset, Utc, TimeZone};
use entity::job::{Entity as Job, Model as JobModel, ActiveModel as JobActiveModel};
use entity::job_source::Entity as JobSource;
use entity::job_source::Column as JobSourceColumn;

use crate::sync::file_parser::{FileParser, JobHeaderMapping};
use crate::sync::types::ImportResult;
use framework::id::gen_id;

const BATCH_SIZE: usize = 1000;

pub struct JobImporter;

impl JobImporter {
    pub async fn import(
        conn: &DatabaseConnection,
        data: Vec<Vec<String>>,
        username: &str,
    ) -> Result<ImportResult, String> {
        let start_time = std::time::Instant::now();
        
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
        
        let (valid, version, actual_version, lack_columns, warnings) = FileParser::validate_job_headers(headers);
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
        
        if mapping.job_id.is_none() && mapping.name.is_none() {
            return Err("Invalid job file: missing required headers".to_string());
        }

        let rows = &data[1..];
        let mut imported = 0;
        let mut updated = 0;
        let mut errors = Vec::new();
        let total = rows.len();
        let now = Utc::now().with_timezone(&FixedOffset::west_opt(0).unwrap());

        for chunk in rows.chunks(BATCH_SIZE) {
            let mut source_models = Vec::new();
            let mut job_models = Vec::new();
            
            for row in chunk {
                match Self::parse_row(&mapping, row, username) {
                    Ok((source_model, job_model)) => {
                        source_models.push(source_model);
                        job_models.push(job_model);
                    }
                    Err(e) => errors.push(e),
                }
            }

            if !source_models.is_empty() {
                let job_ids: Vec<String> = source_models.iter()
                    .filter_map(|m| m.job_id.clone().take().flatten())
                    .collect();
                let uris: Vec<String> = source_models.iter()
                    .filter_map(|m| m.uri.clone().take().flatten())
                    .collect();
                
                let existing: Vec<entity::job_source::Model> = if !job_ids.is_empty() && !uris.is_empty() {
                    JobSource::find()
                        .filter(JobSourceColumn::JobId.is_in(job_ids.clone()))
                        .filter(JobSourceColumn::Uri.is_in(uris.clone()))
                        .all(conn)
                        .await
                        .map_err(|e| e.to_string())?
                } else {
                    vec![]
                };
                
                let existing_keys: HashSet<(String, String)> = existing.iter()
                    .filter_map(|r| {
                        Some((r.job_id.clone()?, r.uri.clone()?))
                    })
                    .collect();
                
                let to_insert: Vec<entity::job_source::ActiveModel> = source_models.into_iter()
                    .filter(|m| {
                        if let (Some(job_id), Some(uri)) = (m.job_id.as_ref(), m.uri.as_ref()) {
                            !existing_keys.contains(&(job_id.clone(), uri.clone()))
                        } else {
                            false
                        }
                    })
                    .collect();
                
                if !to_insert.is_empty() {
                    let _ = JobSource::insert_many(to_insert)
                        .exec(conn)
                        .await
                        .map_err(|e| errors.push(format!("JobSource batch insert error: {}", e)));
                }
            }

            if !job_models.is_empty() {
                let mut insert_count = 0;
                let mut update_count = 0;
                
                for model in job_models {
                    let id = match &model.id {
                        ActiveValue::Set(v) => v.clone(),
                        _ => continue,
                    };
                    let existing = Job::find_by_id(&id).one(conn).await.map_err(|e| e.to_string())?;
                    
                    match existing {
                        Some(existing_record) => {
                            let should_update = Self::should_update(&existing_record, &model);
                            if should_update {
                                let mut update_model = Self::build_update_model(&model, &existing_record);
                                update_model.id = ActiveValue::Unchanged(id.clone());
                                
                                match Job::update(update_model).exec(conn).await {
                                    Ok(_) => update_count += 1,
                                    Err(e) => errors.push(format!("Update error for {}: {}", id, e)),
                                }
                            }
                        }
                        None => {
                            let mut insert_model = model.clone();
                            insert_model.id = ActiveValue::Set(id);
                            
                            if insert_model.create_datetime.is_not_set() {
                                insert_model.create_datetime = ActiveValue::Set(Some(now));
                            }
                            if insert_model.update_datetime.is_not_set() {
                                insert_model.update_datetime = ActiveValue::Set(Some(now));
                            }
                            
                            match Job::insert(insert_model).exec(conn).await {
                                Ok(_) => insert_count += 1,
                                Err(e) => errors.push(format!("Insert error: {}", e)),
                            }
                        }
                    }
                }
                imported += insert_count;
                updated += update_count;
            }
        }

        Ok(ImportResult {
            success: errors.is_empty(),
            valid_result: true,
            data_version: version,
            actual_version,
            lack_columns: vec![],
            valid_columns: FileParser::get_job_valid_columns(actual_version),
            total,
            imported,
            updated,
            cost_time: start_time.elapsed().as_millis() as i64,
            errors,
            warnings,
        })
    }

    fn should_update(existing: &JobModel, new: &JobActiveModel) -> bool {
        let new_update_time = Self::parse_datetime(&new.update_datetime);
        
        if let (Some(existing_update), Some(new_update)) = (existing.update_datetime, new_update_time)
            && new_update > existing_update
        {
            return true;
        }
        
        let new_is_full = Self::get_bool(&new.is_full_company_name);
        if new_is_full == Some(true) && existing.is_full_company_name != Some(true) {
            return true;
        }
        
        let new_create_time = Self::parse_datetime(&new.create_datetime);
        if let (Some(existing_create), Some(new_create)) = (existing.create_datetime, new_create_time)
            && new_create < existing_create
        {
            return true;
        }
        
        false
    }

    fn build_update_model(new: &JobActiveModel, existing: &JobModel) -> JobActiveModel {
        let mut model = new.clone();
        
        let new_update_time = Self::parse_datetime(&new.update_datetime);
        let new_create_time = Self::parse_datetime(&new.create_datetime);
        
        if let (Some(existing_create), Some(new_create)) = (existing.create_datetime, new_create_time) {
            if new_create > existing_create {
                model.create_datetime = ActiveValue::Set(Some(existing_create));
            } else {
                model.create_datetime = ActiveValue::NotSet;
            }
        } else {
            model.create_datetime = ActiveValue::NotSet;
        }
        
        if new.update_datetime.is_not_set() || new_update_time.is_none() {
            model.update_datetime = ActiveValue::Set(Some(Utc::now().with_timezone(&FixedOffset::west_opt(0).unwrap())));
        }
        
        let new_is_full = Self::get_bool(&new.is_full_company_name);
        if new_is_full != Some(true) && existing.is_full_company_name == Some(true) {
            model.company_name = ActiveValue::Set(existing.company_name.clone());
            model.is_full_company_name = ActiveValue::Set(Some(true));
        }
        
        model
    }

    fn parse_datetime(active_value: &ActiveValue<Option<DateTime<FixedOffset>>>) -> Option<DateTime<FixedOffset>> {
        match active_value {
            ActiveValue::Set(v) => *v,
            _ => None,
        }
    }

    fn get_bool(active_value: &ActiveValue<Option<bool>>) -> Option<bool> {
        match active_value {
            ActiveValue::Set(v) => *v,
            _ => None,
        }
    }

    fn parse_row(mapping: &JobHeaderMapping, row: &[String], username: &str) -> Result<(entity::job_source::ActiveModel, JobActiveModel), String> {
        let get_string = |idx: Option<usize>| -> Option<String> {
            idx.and_then(|i| row.get(i).map(|s| s.trim().to_string()))
                .filter(|s| !s.is_empty())
        };

        let get_f64 = |idx: Option<usize>| -> Option<f64> {
            idx.and_then(|i| row.get(i))
                .and_then(|s| s.trim().parse().ok())
        };

        let get_i32 = |idx: Option<usize>| -> Option<i32> {
            idx.and_then(|i| row.get(i))
                .and_then(|s| s.trim().parse().ok())
        };

        let get_bool_from_string = |idx: Option<usize>| -> Option<bool> {
            idx.and_then(|i| row.get(i))
                .and_then(|s| {
                    let trimmed = s.trim().to_lowercase();
                    match trimmed.as_str() {
                        "true" | "1" | "是" => Some(true),
                        "false" | "0" | "否" => Some(false),
                        _ => None,
                    }
                })
        };

        let get_datetime = |idx: Option<usize>| -> Option<DateTime<FixedOffset>> {
            idx.and_then(|i| row.get(i))
                .and_then(|s| {
                    let trimmed = s.trim();
                    if trimmed.is_empty() {
                        return None;
                    }
                    chrono::NaiveDate::parse_from_str(trimmed, "%Y-%m-%d %H:%M:%S")
                        .ok()
                        .map(|d| d.and_hms_opt(0, 0, 0).unwrap())
                        .and_then(|nd| FixedOffset::west_opt(0).unwrap().from_local_datetime(&nd).single())
                        .or_else(|| {
                            chrono::NaiveDate::parse_from_str(trimmed, "%Y-%m-%d")
                                .ok()
                                .and_then(|d| Some(d.and_hms_opt(0, 0, 0).unwrap()))
                                .and_then(|nd| FixedOffset::west_opt(0).unwrap().from_local_datetime(&nd).single())
                        })
                })
        };

        let job_id = get_string(mapping.job_id.clone())
            .or_else(|| get_string(mapping.name.clone()));

        let now = Utc::now().with_timezone(&FixedOffset::west_opt(0).unwrap());
        
        let uri = format!("data://{}@system", username);

        let source_id = gen_id();
        
        let mut source_model = entity::job_source::ActiveModel::new();
        source_model.id = ActiveValue::Set(source_id);
        source_model.job_id = ActiveValue::Set(job_id.clone());
        source_model.uri = ActiveValue::Set(Some(uri.clone()));
        
        let mut job_model = JobActiveModel::new();
        if let Some(id) = job_id {
            job_model.id = ActiveValue::Set(id);
        } else {
            job_model.id = ActiveValue::Set(xid::new().to_string());
        }

        if let Some(v) = get_string(mapping.platform.clone()) {
            source_model.platform = ActiveValue::Set(Some(v.clone()));
            job_model.platform = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.url.clone()) {
            source_model.url = ActiveValue::Set(Some(v.clone()));
            job_model.url = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.name.clone()) {
            source_model.name = ActiveValue::Set(Some(v.clone()));
            job_model.name = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.company_name.clone()) {
            source_model.company_name = ActiveValue::Set(Some(v.clone()));
            job_model.company_name = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.location_name.clone()) {
            source_model.location_name = ActiveValue::Set(Some(v.clone()));
            job_model.location_name = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.address.clone()) {
            source_model.address = ActiveValue::Set(Some(v.clone()));
            job_model.address = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_f64(mapping.longitude.clone()) {
            source_model.longitude = ActiveValue::Set(Some(v));
            job_model.longitude = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_f64(mapping.latitude.clone()) {
            source_model.latitude = ActiveValue::Set(Some(v));
            job_model.latitude = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.description.clone()) {
            source_model.description = ActiveValue::Set(Some(v.clone()));
            job_model.description = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.degree_name.clone()) {
            source_model.degree_name = ActiveValue::Set(Some(v.clone()));
            job_model.degree_name = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_i32(mapping.year.clone()) {
            source_model.year = ActiveValue::Set(Some(v));
            job_model.year = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_f64(mapping.salary_min.clone()) {
            source_model.salary_min = ActiveValue::Set(Some(v as f32));
            job_model.salary_min = ActiveValue::Set(Some(v as f32));
        }
        if let Some(v) = get_f64(mapping.salary_max.clone()) {
            source_model.salary_max = ActiveValue::Set(Some(v as f32));
            job_model.salary_max = ActiveValue::Set(Some(v as f32));
        }
        if let Some(v) = get_i32(mapping.salary_total_month.clone()) {
            source_model.salary_total_month = ActiveValue::Set(Some(v));
            job_model.salary_total_month = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.first_publish_datetime.clone()) {
            if let Ok(dt) = chrono::NaiveDate::parse_from_str(&v, "%Y-%m-%d") {
                if let Some(nd) = dt.and_hms_opt(0, 0, 0) {
                    if let Some(fixed) = FixedOffset::west_opt(0).unwrap().from_local_datetime(&nd).single() {
                        source_model.first_publish_datetime = ActiveValue::Set(Some(fixed));
                        job_model.first_publish_datetime = ActiveValue::Set(Some(fixed));
                    }
                }
            }
        }
        if let Some(v) = get_string(mapping.boss_name.clone()) {
            source_model.boss_name = ActiveValue::Set(Some(v.clone()));
            job_model.boss_name = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.boss_company_name.clone()) {
            source_model.boss_company_name = ActiveValue::Set(Some(v.clone()));
            job_model.boss_company_name = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.boss_position.clone()) {
            source_model.boss_position = ActiveValue::Set(Some(v.clone()));
            job_model.boss_position = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.skill_tag.clone()) {
            source_model.skill_tag = ActiveValue::Set(Some(v.clone()));
            job_model.skill_tag = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.welfare_tag.clone()) {
            source_model.welfare_tag = ActiveValue::Set(Some(v.clone()));
            job_model.welfare_tag = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_bool_from_string(mapping.is_full_company_name.clone()) {
            source_model.is_full_company_name = ActiveValue::Set(Some(v));
            job_model.is_full_company_name = ActiveValue::Set(Some(v));
        }
        
        if let Some(v) = get_datetime(mapping.create_datetime.clone()) {
            source_model.first_scan_datetime = ActiveValue::Set(Some(v));
            source_model.create_datetime = ActiveValue::Set(Some(v));
            job_model.create_datetime = ActiveValue::Set(Some(v));
            job_model.first_scan_datetime = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_datetime(mapping.update_datetime.clone()) {
            source_model.update_datetime = ActiveValue::Set(Some(v));
            job_model.update_datetime = ActiveValue::Set(Some(v));
        }

        source_model.publish_datetime = ActiveValue::Set(Some(now));
        source_model.create_datetime = ActiveValue::Set(Some(now));
        source_model.update_datetime = ActiveValue::Set(Some(now));

        job_model.uri = ActiveValue::Set(Some(uri));

        Ok((source_model, job_model))
    }
}