use sea_orm::{DatabaseConnection, EntityTrait, ActiveValue, sea_query, ActiveModelBehavior};
use chrono::{DateTime, FixedOffset, NaiveDate, Utc};

use entity::job::{Entity as Job, ActiveModel};
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
                for model in models {
                    match Job::insert(model.clone())
                        .on_conflict(
                            sea_query::OnConflict::column(entity::job::Column::Id)
                                .do_nothing()
                                .to_owned()
                        )
                        .exec(conn)
                        .await
                    {
                        Ok(_) => imported += 1,
                        Err(e) => errors.push(format!("Insert error: {}", e)),
                    }
                }
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

        let id = get_string(mapping.job_id.clone())
            .or_else(|| get_string(mapping.name.clone()))
            .unwrap_or_else(|| xid::new().to_string());

        let mut model = ActiveModel::new();
        model.id = ActiveValue::Set(id);
        
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
        
        let now = Utc::now().with_timezone(&FixedOffset::west_opt(0).unwrap());
        model.create_datetime = ActiveValue::Set(Some(now));
        model.update_datetime = ActiveValue::Set(Some(now));

        Ok(model)
    }
}
