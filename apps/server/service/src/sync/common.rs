use chrono::{DateTime, FixedOffset, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::sync::result::RowValidationError;

pub const BATCH_SIZE: usize = 900;

pub fn get_field_value(field_idx: &Option<usize>, row: &[String]) -> String {
    match field_idx {
        Some(idx) if *idx < row.len() => row[*idx].clone(),
        _ => String::new(),
    }
}

pub fn get_string(row: &[String], idx: Option<usize>) -> Option<String> {
    idx.and_then(|i| row.get(i).map(|s| s.trim().to_string()))
        .filter(|s| !s.is_empty())
}

pub fn get_field_name(headers: &[String], idx: Option<usize>) -> String {
    idx.and_then(|i| headers.get(i).map(|s| s.trim().to_string()))
        .unwrap_or_default()
}

pub fn get_f64(
    row: &[String],
    headers: &[String],
    idx: Option<usize>,
    row_index: usize,
) -> Result<f64, Box<dyn std::error::Error>> {
    let field_name = get_field_name(headers, idx);
    match idx {
        Some(i) if i < row.len() => {
            let s = &row[i];
            let trimmed = s.trim();
            if trimmed.is_empty() {
                Ok(0.0)
            } else {
                trimmed.parse::<f64>().map_err(|_| {
                    RowValidationError::InvalidFloat {
                        row: row_index,
                        field: field_name,
                        value: trimmed.to_string(),
                    }
                    .into()
                })
            }
        }
        _ => Ok(0.0),
    }
}

pub fn get_f32(
    row: &[String],
    headers: &[String],
    idx: Option<usize>,
    row_index: usize,
) -> Result<f32, Box<dyn std::error::Error>> {
    let field_name = get_field_name(headers, idx);
    match idx {
        Some(i) if i < row.len() => {
            let s = &row[i];
            let trimmed = s.trim();
            if trimmed.is_empty() {
                Ok(0.0)
            } else {
                trimmed.parse::<f32>().map_err(|_| {
                    RowValidationError::InvalidFloat {
                        row: row_index,
                        field: field_name,
                        value: trimmed.to_string(),
                    }
                    .into()
                })
            }
        }
        _ => Ok(0.0),
    }
}

pub fn get_i32(
    row: &[String],
    headers: &[String],
    idx: Option<usize>,
    row_index: usize,
) -> Result<i32, Box<dyn std::error::Error>> {
    let field_name = get_field_name(headers, idx);
    match idx {
        Some(i) if i < row.len() => {
            let s = &row[i];
            let trimmed = s.trim();
            if trimmed.is_empty() {
                Ok(0)
            } else {
                trimmed.parse::<i32>().map_err(|_| {
                    RowValidationError::InvalidInteger {
                        row: row_index,
                        field: field_name,
                        value: trimmed.to_string(),
                    }
                    .into()
                })
            }
        }
        _ => Ok(0),
    }
}

pub fn parse_datetime(
    s: &str,
) -> Result<Option<DateTime<FixedOffset>>, Box<dyn std::error::Error>> {
    if s.trim().is_empty() {
        return Ok(None);
    }
    if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
        return Ok(Some(dt.with_timezone(&Utc).fixed_offset()));
    }
    let naive = chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S")?;
    let offset = FixedOffset::east_opt(8 * 3600).unwrap();
    Ok(Some(
        offset.from_utc_datetime(&naive).to_utc().fixed_offset(),
    ))
}

pub fn parse_bool(s: &str) -> Option<bool> {
    match s.trim() {
        "是" | "true" | "1" => Some(true),
        "否" | "false" | "0" => Some(false),
        _ => None,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SyncStatus {
    pub last_sync_job: Option<DateTime<FixedOffset>>,
    pub last_sync_company: Option<DateTime<FixedOffset>>,
    pub last_scan_job: Option<DateTime<FixedOffset>>,
    pub last_source_update_company: Option<DateTime<FixedOffset>>,
    pub scheduler_running: bool,
    pub total_jobs: i64,
    pub total_companies: i64,
}
