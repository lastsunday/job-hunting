use chrono::{DateTime, FixedOffset};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::Validate;

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

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, Validate)]
pub struct SyncGitParam {
    pub base_url: Option<String>,
    pub owner: String,
    pub repo_name: String,
    pub token: Option<String>,
    pub start_datetime: Option<DateTime<FixedOffset>>,
    pub end_datetime: Option<DateTime<FixedOffset>>,
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
pub struct SyncConfig {
    pub git_enabled: bool,
    pub git_base_url: String,
    pub git_token: Option<String>,
    pub default_repo: Option<String>,
    pub schedule_enabled: bool,
    pub schedule_cron: String,
    pub sync_jobs: bool,
    pub sync_companies: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ImportResult {
    pub success: bool,
    pub total: usize,
    pub imported: usize,
    pub updated: usize,
    pub errors: Vec<String>,
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
