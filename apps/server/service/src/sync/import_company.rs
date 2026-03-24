use sea_orm::{DatabaseConnection, EntityTrait, ActiveValue, sea_query, ActiveModelBehavior};
use chrono::{DateTime, FixedOffset, NaiveDate, Utc};

use entity::company::{Entity as Company, ActiveModel};
use crate::sync::file_parser::{FileParser, CompanyHeaderMapping};
use crate::sync::types::ImportResult;

const BATCH_SIZE: usize = 1000;

pub struct CompanyImporter;

impl CompanyImporter {
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
        let mapping = FileParser::parse_company_headers(headers);
        
        if mapping.name.is_none() {
            return Err("Invalid company file: missing required headers".to_string());
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
                    match Company::insert(model.clone())
                        .on_conflict(
                            sea_query::OnConflict::column(entity::company::Column::Id)
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

    fn parse_row(mapping: &CompanyHeaderMapping, row: &[String]) -> Result<ActiveModel, String> {
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

        let id = xid::new().to_string();

        let mut model = ActiveModel::new();
        model.id = ActiveValue::Set(id);
        model.name = ActiveValue::Set(Some(name));
        
        if let Some(v) = get_string(mapping.platform.clone()) {
            model.platform = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.description.clone()) {
            model.description = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.start_date.clone()) {
            if let Ok(date) = NaiveDate::parse_from_str(&v, "%Y-%m-%d") {
                model.start_date = ActiveValue::Set(Some(date));
            }
        }
        if let Some(v) = get_string(mapping.status.clone()) {
            model.status = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.legal_person.clone()) {
            model.legal_person = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.unified_code.clone()) {
            model.unified_code = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.website.clone()) {
            model.website = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_i32(mapping.insurance_num.clone()) {
            model.insurance_num = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_i32(mapping.self_risk.clone()) {
            model.self_risk = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_i32(mapping.union_risk.clone()) {
            model.union_risk = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.address.clone()) {
            model.address = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.scope.clone()) {
            model.scope = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.tax_no.clone()) {
            model.tax_no = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.industry.clone()) {
            model.industry = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.license_number.clone()) {
            model.license_number = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_f64(mapping.longitude.clone()) {
            model.longitude = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_f64(mapping.latitude.clone()) {
            model.latitude = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_f64(mapping.reg_capital_value.clone()) {
            model.reg_capital_value = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.reg_capital_currency.clone()) {
            model.reg_capital_currency = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.source_url.clone()) {
            model.source_url = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.source_record_id.clone()) {
            model.source_record_id = ActiveValue::Set(Some(v));
        }
        if let Some(v) = get_string(mapping.source_refresh_datetime.clone()) {
            if let Ok(dt) = DateTime::parse_from_rfc3339(&v) {
                model.source_refresh_datetime = ActiveValue::Set(Some(dt));
            } else if let Ok(dt) = DateTime::parse_from_str(&v, "%Y-%m-%d %H:%M:%S") {
                model.source_refresh_datetime = ActiveValue::Set(Some(dt));
            } else if let Ok(dt) = DateTime::parse_from_str(&v, "%Y-%m-%dT%H:%M:%S") {
                model.source_refresh_datetime = ActiveValue::Set(Some(dt));
            }
        }
        
        let now = Utc::now().with_timezone(&FixedOffset::west_opt(0).unwrap());
        model.create_datetime = ActiveValue::Set(Some(now));
        model.update_datetime = ActiveValue::Set(Some(now));

        Ok(model)
    }
}
