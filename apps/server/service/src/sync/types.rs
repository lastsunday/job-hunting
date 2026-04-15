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
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
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
