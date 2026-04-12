use std::collections::HashSet;

use chrono::{DateTime, FixedOffset, NaiveDate, Utc};
use sea_orm::{
    ActiveModelBehavior, ActiveValue, DatabaseConnection, EntityTrait,
    QueryFilter, ColumnTrait,
};

use entity::company::{
    ActiveModel as CompanyActiveModel, Entity as Company, Model as CompanyModel,
};
use entity::company_source::Column as CompanySourceColumn;
use entity::company_source::Entity as CompanySource;

use crate::sync::file_parser::{CompanyHeaderMapping, FileParser};
use crate::sync::types::ImportResult;
use crate::util::gen_company_id;
use framework::id::gen_id;

const BATCH_SIZE: usize = 1000;

pub struct CompanyImporter;

impl CompanyImporter {
    pub async fn import(
        conn: &DatabaseConnection,
        data: Vec<Vec<String>>,
        username: &str,
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
        let mapping = FileParser::parse_company_headers(headers);
        
        if mapping.name.is_none() {
            return Err("Invalid company file: missing required headers".to_string());
        }

        let rows = &data[1..];
        let mut imported = 0;
        let mut updated = 0;
        let mut errors = Vec::new();
        let total = rows.len();
        let now = Utc::now().with_timezone(&FixedOffset::west_opt(0).unwrap());

        for chunk in rows.chunks(BATCH_SIZE) {
            let mut source_models = Vec::new();
            let mut company_models = Vec::new();
            
            for row in chunk {
                match Self::parse_row(&mapping, row, username) {
                    Ok((source_model, company_model)) => {
                        source_models.push(source_model);
                        company_models.push(company_model);
                    }
                    Err(e) => errors.push(e),
                }
            }

            if !source_models.is_empty() {
                let company_ids: Vec<String> = source_models.iter()
                    .filter_map(|m| m.company_id.clone().take().flatten())
                    .collect();
                let uris: Vec<String> = source_models.iter()
                    .filter_map(|m| m.uri.clone().take().flatten())
                    .collect();
                
                let existing: Vec<entity::company_source::Model> = if !company_ids.is_empty() && !uris.is_empty() {
                    CompanySource::find()
                        .filter(CompanySourceColumn::CompanyId.is_in(company_ids.clone()))
                        .filter(CompanySourceColumn::Uri.is_in(uris.clone()))
                        .all(conn)
                        .await
                        .map_err(|e| e.to_string())?
                } else {
                    vec![]
                };
                
                let existing_keys: HashSet<(String, String)> = existing.iter()
                    .filter_map(|r| {
                        Some((r.company_id.clone()?, r.uri.clone()?))
                    })
                    .collect();
                
                let to_insert: Vec<entity::company_source::ActiveModel> = source_models.into_iter()
                    .filter(|m| {
                        if let (Some(company_id), Some(uri)) = (m.company_id.as_ref(), m.uri.as_ref()) {
                            !existing_keys.contains(&(company_id.clone(), uri.clone()))
                        } else {
                            false
                        }
                    })
                    .collect();
                
                if !to_insert.is_empty() {
                    let _ = CompanySource::insert_many(to_insert)
                        .exec(conn)
                        .await
                        .map_err(|e| errors.push(format!("CompanySource batch insert error: {}", e)));
                }
            }

            if !company_models.is_empty() {
                for model in company_models {
                    let id = match &model.id {
                        ActiveValue::Set(v) => v.clone(),
                        _ => continue,
                    };
                    
                    let existing = Company::find_by_id(&id).one(conn).await.map_err(|e| e.to_string())?;
                    
                    match existing {
                        Some(existing_record) => {
                            let should_update = Self::should_update(&existing_record, &model);
                            if should_update {
                                let mut update_model = Self::build_update_model(&model, &existing_record);
                                update_model.id = ActiveValue::Unchanged(id.clone());
                                
                                match Company::update(update_model).exec(conn).await {
                                    Ok(_) => updated += 1,
                                    Err(e) => errors.push(format!("Update error for {}: {}", id, e)),
                                }
                            }
                        }
                        None => {
                            let mut insert_model = model.clone();
                            insert_model.id = ActiveValue::Set(id);
                            insert_model.create_datetime = ActiveValue::Set(Some(now));
                            insert_model.update_datetime = ActiveValue::Set(Some(now));
                            
                            match Company::insert(insert_model).exec(conn).await {
                                Ok(_) => imported += 1,
                                Err(e) => errors.push(format!("Insert error: {}", e)),
                            }
                        }
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

    fn should_update(existing: &CompanyModel, new: &CompanyActiveModel) -> bool {
        let new_refresh_time = Self::parse_datetime(&new.source_refresh_datetime);
        
        if let (Some(existing_refresh), Some(new_refresh)) = (existing.source_refresh_datetime, new_refresh_time)
            && new_refresh > existing_refresh
        {
            return true;
        }
        
        false
    }

    fn build_update_model(new: &CompanyActiveModel, _existing: &CompanyModel) -> CompanyActiveModel {
        let mut model = new.clone();
        model.update_datetime = ActiveValue::Set(Some(Utc::now().with_timezone(&FixedOffset::west_opt(0).unwrap())));
        model
    }

    fn parse_datetime(active_value: &ActiveValue<Option<DateTime<FixedOffset>>>) -> Option<DateTime<FixedOffset>> {
        match active_value {
            ActiveValue::Set(v) => *v,
            _ => None,
        }
    }

    fn parse_row(mapping: &CompanyHeaderMapping, row: &[String], username: &str) -> Result<(entity::company_source::ActiveModel, CompanyActiveModel), String> {
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

        let name = get_string(mapping.name.clone())
            .ok_or("Company name is required")?;

        let id = gen_company_id(&name);
        
        let now = Utc::now().with_timezone(&FixedOffset::west_opt(0).unwrap());
        let source_id = gen_id();
        
        let uri = format!("data://{}@system", username);

        let mut source_model = entity::company_source::ActiveModel::new();
        source_model.id = ActiveValue::Set(source_id);
        source_model.company_id = ActiveValue::Set(Some(id.clone()));
        source_model.name = ActiveValue::Set(Some(name.clone()));
        source_model.uri = ActiveValue::Set(Some(uri.clone()));
        
        let mut company_model = CompanyActiveModel::new();
        company_model.id = ActiveValue::Set(id.clone());
        company_model.name = ActiveValue::Set(Some(name));
        company_model.uri = ActiveValue::Set(Some(uri));

        if let Some(v) = get_string(mapping.description.clone()) {
            source_model.desc = ActiveValue::Set(Some(v.clone()));
            company_model.desc = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.start_date.clone()) {
            if let Ok(date) = NaiveDate::parse_from_str(&v, "%Y-%m-%d") {
                source_model.start_date = ActiveValue::Set(Some(date));
                company_model.start_date = ActiveValue::Set(Some(date));
            }
        }
        if let Some(v) = get_string(mapping.status.clone()) {
            source_model.status = ActiveValue::Set(Some(v.clone()));
            company_model.status = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.legal_person.clone()) {
            source_model.legal_person = ActiveValue::Set(Some(v.clone()));
            company_model.legal_person = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.unified_code.clone()) {
            source_model.unified_code = ActiveValue::Set(Some(v.clone()));
            company_model.unified_code = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.website.clone()) {
            source_model.web_site = ActiveValue::Set(Some(v.clone()));
            company_model.web_site = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_i32(mapping.insurance_num.clone()) {
            source_model.insurance_num = ActiveValue::Set(Some(v));
            company_model.insurance_num = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_i32(mapping.self_risk.clone()) {
            source_model.self_risk = ActiveValue::Set(Some(v));
            company_model.self_risk = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_i32(mapping.union_risk.clone()) {
            source_model.union_risk = ActiveValue::Set(Some(v));
            company_model.union_risk = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.address.clone()) {
            source_model.address = ActiveValue::Set(Some(v.clone()));
            company_model.address = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.scope.clone()) {
            source_model.scope = ActiveValue::Set(Some(v.clone()));
            company_model.scope = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.tax_no.clone()) {
            source_model.tax_no = ActiveValue::Set(Some(v.clone()));
            company_model.tax_no = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.industry.clone()) {
            source_model.industry = ActiveValue::Set(Some(v.clone()));
            company_model.industry = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.license_number.clone()) {
            source_model.license_number = ActiveValue::Set(Some(v.clone()));
            company_model.license_number = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_f64(mapping.longitude.clone()) {
            source_model.longitude = ActiveValue::Set(Some(v));
            company_model.longitude = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_f64(mapping.latitude.clone()) {
            source_model.latitude = ActiveValue::Set(Some(v));
            company_model.latitude = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_f64(mapping.reg_capital_value.clone()) {
            source_model.reg_capital_value = ActiveValue::Set(Some(v));
            company_model.reg_capital_value = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.reg_capital_currency.clone()) {
            source_model.reg_capital_currency = ActiveValue::Set(Some(v.clone()));
            company_model.reg_capital_currency = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.source_url.clone()) {
            source_model.source_url = ActiveValue::Set(Some(v.clone()));
            company_model.source_url = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.platform.clone()) {
            source_model.source_platform = ActiveValue::Set(Some(v.clone()));
            company_model.source_platform = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.source_record_id.clone()) {
            source_model.source_record_id = ActiveValue::Set(Some(v.clone()));
            company_model.source_record_id = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.source_refresh_datetime.clone()) {
            let mut parsed = None;
            if let Ok(dt) = DateTime::parse_from_rfc3339(&v) {
                parsed = Some(dt);
            } else if let Ok(dt) = DateTime::parse_from_str(&v, "%Y-%m-%d %H:%M:%S") {
                parsed = Some(dt);
            } else if let Ok(dt) = DateTime::parse_from_str(&v, "%Y-%m-%dT%H:%M:%S") {
                parsed = Some(dt);
            }
            if let Some(dt) = parsed {
                source_model.source_refresh_datetime = ActiveValue::Set(Some(dt));
                company_model.source_refresh_datetime = ActiveValue::Set(Some(dt));
            }
        }
        
        source_model.publish_datetime = ActiveValue::Set(Some(now));
        source_model.create_datetime = ActiveValue::Set(Some(now));
        source_model.update_datetime = ActiveValue::Set(Some(now));

        Ok((source_model, company_model))
    }
}