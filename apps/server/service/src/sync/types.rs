use chrono::{DateTime, FixedOffset};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum SyncDataType {
    Job,
    Company,
    JobTag,
    CompanyTag,
}

impl SyncDataType {
    pub fn as_str(&self) -> &'static str {
        match self {
            SyncDataType::Job => "job",
            SyncDataType::Company => "company",
            SyncDataType::JobTag => "job_tag",
            SyncDataType::CompanyTag => "company_tag",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SyncStatus {
    pub last_sync_job: Option<DateTime<FixedOffset>>,
    pub last_sync_company: Option<DateTime<FixedOffset>>,
    pub scheduler_running: bool,
    pub total_jobs: i64,
    pub total_companies: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(tag = "error_type")]
pub enum ImportError {
    InvalidInteger {
        row: usize,
        field: String,
        value: String,
    },
    InvalidFloat {
        row: usize,
        field: String,
        value: String,
    },
    MissingRequiredField {
        row: usize,
        field: String,
    },
}

impl std::fmt::Display for ImportError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ImportError::InvalidInteger { row, field, value } => {
                write!(
                    f,
                    "InvalidInteger row:{} field:{} value:{}",
                    row, field, value
                )
            }
            ImportError::InvalidFloat { row, field, value } => {
                write!(
                    f,
                    "InvalidFloat row:{} field:{} value:{}",
                    row, field, value
                )
            }
            ImportError::MissingRequiredField { row, field } => {
                write!(f, "MissingRequiredField row:{} field:{}", row, field)
            }
        }
    }
}

impl std::error::Error for ImportError {}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(tag = "error_type")]
pub enum ImportWarning {
    VersionExceeded {
        file_version: usize,
        max_supported_version: usize,
        actual_version: usize,
    },
}

impl std::fmt::Display for ImportWarning {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ImportWarning::VersionExceeded {
                file_version,
                max_supported_version,
                actual_version,
            } => {
                write!(
                    f,
                    "VersionExceeded file_version:{} max:{} actual:{}",
                    file_version, max_supported_version, actual_version
                )
            }
        }
    }
}

impl std::error::Error for ImportWarning {}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ImportResult {
    pub success: bool,
    pub valid_result: bool,
    pub data_version: usize,
    pub actual_version: usize,
    pub lack_columns: Vec<String>,
    pub valid_columns: Vec<String>,
    pub total: usize,
    pub imported: usize,
    pub updated: usize,
    pub cost_time: i64,
    pub errors: Vec<ImportError>,
    pub warnings: Vec<ImportWarning>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SyncResult {
    pub success: bool,
    pub total_files: usize,
    pub total_records: usize,
    pub imported: usize,
    pub updated: usize,
    pub errors: Vec<String>,
}
