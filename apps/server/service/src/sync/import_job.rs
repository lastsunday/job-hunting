use sea_orm::{DatabaseConnection, EntityTrait, ActiveValue, ActiveModelBehavior};
use chrono::{DateTime, FixedOffset, Utc, TimeZone};
use entity::job::{Entity as Job, Model, ActiveModel};

use crate::sync::file_parser::{FileParser, JobHeaderMapping};
use crate::sync::types::ImportResult;

const BATCH_SIZE: usize = 1000;

pub struct JobImporter;

impl JobImporter {
    pub async fn import(
        conn: &DatabaseConnection,
        data: Vec<Vec<String>>,
    ) -> Result<ImportResult, String> {
        if data.is_empty() {
            return Ok(ImportResult {
                success: true,
                total: 0,
                imported: 0,
                updated: 0,
                errors: vec![],
            });
        }

        let headers = &data[0];
        let mapping = FileParser::parse_job_headers(headers);
        
        if mapping.job_id.is_none() && mapping.name.is_none() {
            return Err("Invalid job file: missing required headers".to_string());
        }

        let rows = &data[1..];
        let mut imported = 0;
        let mut updated = 0;
        let mut errors = Vec::new();
        let total = rows.len();

        for chunk in rows.chunks(BATCH_SIZE) {
            let mut models = Vec::new();
            
            for row in chunk {
                match Self::parse_row(&mapping, row) {
                    Ok(active_model) => models.push(active_model),
                    Err(e) => errors.push(e),
                }
            }

            if !models.is_empty() {
                let mut insert_count = 0;
                let mut update_count = 0;
                
                for model in models {
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
                                insert_model.create_datetime = ActiveValue::Set(Some(Utc::now().with_timezone(&FixedOffset::west_opt(0).unwrap())));
                            }
                            if insert_model.update_datetime.is_not_set() {
                                insert_model.update_datetime = ActiveValue::Set(Some(Utc::now().with_timezone(&FixedOffset::west_opt(0).unwrap())));
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
            total,
            imported,
            updated,
            errors,
        })
    }

    fn should_update(existing: &Model, new: &ActiveModel) -> bool {
        let new_update_time = Self::parse_datetime(&new.update_datetime);
        
        if let (Some(existing_update), Some(new_update)) = (existing.update_datetime, new_update_time) {
            if new_update > existing_update {
                return true;
            }
        }
        
        let new_is_full = Self::get_bool(&new.is_full_company_name);
        if new_is_full == Some(true) && existing.is_full_company_name != Some(true) {
            return true;
        }
        
        let new_create_time = Self::parse_datetime(&new.create_datetime);
        if let (Some(existing_create), Some(new_create)) = (existing.create_datetime, new_create_time) {
            if new_create < existing_create {
                return true;
            }
        }
        
        false
    }

    fn build_update_model(new: &ActiveModel, existing: &Model) -> ActiveModel {
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

    fn parse_row(mapping: &JobHeaderMapping, row: &[String]) -> Result<ActiveModel, String> {
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

        let id = get_string(mapping.job_id.clone())
            .or_else(|| get_string(mapping.name.clone()));

        let mut model = ActiveModel::new();
        if let Some(id) = id {
            model.id = ActiveValue::Set(id);
        } else {
            model.id = ActiveValue::Set(xid::new().to_string());
        }
        
        if let Some(v) = get_string(mapping.platform.clone()) {
            model.platform = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.url.clone()) {
            model.url = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.name.clone()) {
            model.name = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.company_name.clone()) {
            model.company_name = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.location_name.clone()) {
            model.location_name = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.address.clone()) {
            model.address = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_f64(mapping.longitude.clone()) {
            model.longitude = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_f64(mapping.latitude.clone()) {
            model.latitude = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.description.clone()) {
            model.description = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.degree_name.clone()) {
            model.degree_name = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_i32(mapping.year.clone()) {
            model.year = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_f64(mapping.salary_min.clone()) {
            model.salary_min = ActiveValue::Set(Some(v as f32));
        }
        if let Some(v) = get_f64(mapping.salary_max.clone()) {
            model.salary_max = ActiveValue::Set(Some(v as f32));
        }
        if let Some(v) = get_i32(mapping.salary_total_month.clone()) {
            model.salary_total_month = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.first_publish_datetime.clone()) {
            if let Ok(dt) = chrono::NaiveDate::parse_from_str(&v, "%Y-%m-%d") {
                if let Some(nd) = dt.and_hms_opt(0, 0, 0) {
                    if let Some(fixed) = FixedOffset::west_opt(0).unwrap().from_local_datetime(&nd).single() {
                        model.first_publish_datetime = ActiveValue::Set(Some(fixed));
                    }
                }
            }
        }
        if let Some(v) = get_string(mapping.boss_name.clone()) {
            model.boss_name = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.boss_company_name.clone()) {
            model.boss_company_name = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.boss_position.clone()) {
            model.boss_position = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.skill_tag.clone()) {
            model.skill_tag = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.welfare_tag.clone()) {
            model.welfare_tag = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_bool_from_string(mapping.is_full_company_name.clone()) {
            model.is_full_company_name = ActiveValue::Set(Some(v));
        }
        
        if let Some(v) = get_datetime(mapping.create_datetime.clone()) {
            model.create_datetime = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_datetime(mapping.update_datetime.clone()) {
            model.update_datetime = ActiveValue::Set(Some(v));
        }

        Ok(model)
    }
}
