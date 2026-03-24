use crate::AppState;
use axum::{
    debug_handler,
    extract::State,
    routing::post,
};
use axum::routing::get;
use chrono::{DateTime, FixedOffset};
use entity::{job::Entity as Job, company::Entity as Company};
use framework::{
    data::{ApiResponse, valid::ValidJson},
    error::ApiResult,
};
use sea_orm::{EntityTrait, Order, PaginatorTrait, QueryOrder};
use serde::Deserialize;
use anyhow;
use utoipa::ToSchema;
use utoipa_axum::{
    router::{OpenApiRouter, UtoipaMethodRouterExt},
    routes,
};

use service::sync::{
    GitClient, JobImporter, CompanyImporter, JobSync, CompanySync, FileParser,
    types::{SyncGitParam, SyncStatus, SyncConfig as ServiceSyncConfig, ImportResult, SyncResult},
};

const TAG: &str = "sync";

pub fn create_routes(state: AppState) -> OpenApiRouter {
    let sync_state = SyncState::new(state);
    
    OpenApiRouter::new()
        .routes(routes!(import_file).with_state(sync_state.clone()))
        .routes(routes!(sync_git_jobs).with_state(sync_state.clone()))
        .routes(routes!(sync_git_companies).with_state(sync_state.clone()))
        .routes(routes!(get_sync_status).with_state(sync_state.clone()))
        .routes(routes!(get_sync_config))
}

#[derive(Clone)]
pub(crate) struct SyncState {
    inner: AppState,
}

impl SyncState {
    fn new(inner: AppState) -> Self {
        Self { inner }
    }
}

fn conn(state: &SyncState) -> &sea_orm::DatabaseConnection {
    &state.inner.conn
}

#[derive(Debug, Deserialize, ToSchema)]
#[derive(validator::Validate)]
pub struct ImportFileRequest {
    pub data_type: String,
    #[schema(value_type = String)]
    pub file: String,
}

#[debug_handler]
#[utoipa::path(post, path = "/sync/file/import", tag = TAG, security(()), request_body = ImportFileRequest, responses(
    (status = OK, body = ApiResponse<ImportResult>)
))]
pub async fn import_file(
    State(state): State<SyncState>,
    ValidJson(param): ValidJson<ImportFileRequest>,
) -> ApiResult<ApiResponse<ImportResult>> {
    let data = base64::decode(&param.file)
        .map_err(|e| framework::error::ApiError::Validation(format!("Invalid file data: {}", e)))?;

    let result = match param.data_type.as_str() {
        "job" => {
            let rows = FileParser::parse_job_file_from_bytes(&data)
                .map_err(|e| framework::error::ApiError::Validation(e))?;
            JobImporter::import(conn(&state), rows).await
        }
        "company" => {
            let rows = FileParser::parse_company_file_from_bytes(&data)
                .map_err(|e| framework::error::ApiError::Validation(e))?;
            CompanyImporter::import(conn(&state), rows).await
        }
        _ => return Err(framework::error::ApiError::Validation("Invalid data type".to_string())),
    }.map_err(|e| framework::error::ApiError::Validation(e))?;

    Ok(ApiResponse::success(Some(result)))
}

#[debug_handler]
#[utoipa::path(post, path = "/sync/git/jobs", tag = TAG, security(()), request_body = SyncGitParam, responses(
    (status = OK, body = ApiResponse<SyncResult>)
))]
pub async fn sync_git_jobs(
    State(state): State<SyncState>,
    ValidJson(param): ValidJson<SyncGitParam>,
) -> ApiResult<ApiResponse<SyncResult>> {
    let config = framework::config::get();
    
    let base_url = param.base_url.unwrap_or_else(|| config.sync().git().base_url().to_string());
    let token = param.token.or_else(|| config.sync().git().token().map(|t| t.to_string()));
    
    let client = GitClient::new(base_url, token);
    
    let result = JobSync::sync(
        conn(&state),
        &client,
        &param.owner,
        &param.repo_name,
        param.start_datetime,
        param.end_datetime,
    ).await.map_err(|e| framework::error::ApiError::Internal(anyhow::anyhow!(e)))?;

    Ok(ApiResponse::success(Some(result)))
}

#[debug_handler]
#[utoipa::path(post, path = "/sync/git/companies", tag = TAG, security(()), request_body = SyncGitParam, responses(
    (status = OK, body = ApiResponse<SyncResult>)
))]
pub async fn sync_git_companies(
    State(state): State<SyncState>,
    ValidJson(param): ValidJson<SyncGitParam>,
) -> ApiResult<ApiResponse<SyncResult>> {
    let config = framework::config::get();
    
    let base_url = param.base_url.unwrap_or_else(|| config.sync().git().base_url().to_string());
    let token = param.token.or_else(|| config.sync().git().token().map(|t| t.to_string()));
    
    let client = GitClient::new(base_url, token);
    
    let result = CompanySync::sync(
        conn(&state),
        &client,
        &param.owner,
        &param.repo_name,
        param.start_datetime,
        param.end_datetime,
    ).await.map_err(|e| framework::error::ApiError::Internal(anyhow::anyhow!(e)))?;

    Ok(ApiResponse::success(Some(result)))
}

#[debug_handler]
#[utoipa::path(get, path = "/sync/status", tag = TAG, security(()), responses(
    (status = OK, body = ApiResponse<SyncStatus>)
))]
pub async fn get_sync_status(
    State(state): State<SyncState>,
) -> ApiResult<ApiResponse<SyncStatus>> {
    let conn = conn(&state);
    
    let last_job = Job::find()
        .order_by(entity::job::Column::CreateDatetime, Order::Desc)
        .one(conn)
        .await
        .map_err(|e| framework::error::ApiError::Biz(e.to_string()))?
        .and_then(|j| j.create_datetime);
    
    let last_company = Company::find()
        .order_by(entity::company::Column::CreateDatetime, Order::Desc)
        .one(conn)
        .await
        .map_err(|e| framework::error::ApiError::Biz(e.to_string()))?
        .and_then(|c| c.create_datetime);
    
    let total_jobs: i64 = Job::find()
        .count(conn)
        .await
        .map_err(|e| framework::error::ApiError::Biz(e.to_string()))? as i64;
    
    let total_companies: i64 = Company::find()
        .count(conn)
        .await
        .map_err(|e| framework::error::ApiError::Biz(e.to_string()))? as i64;

    Ok(ApiResponse::success(Some(SyncStatus {
        last_sync_job: last_job,
        last_sync_company: last_company,
        scheduler_running: false,
        total_jobs,
        total_companies,
    })))
}

#[debug_handler]
#[utoipa::path(get, path = "/sync/config", tag = TAG, security(()), responses(
    (status = OK, body = ApiResponse<ServiceSyncConfig>)
))]
pub async fn get_sync_config() -> ApiResult<ApiResponse<ServiceSyncConfig>> {
    let config = framework::config::get();
    
    let sync_config = ServiceSyncConfig {
        git_enabled: config.sync().git().enabled(),
        git_base_url: config.sync().git().base_url().to_string(),
        git_token: config.sync().git().token().map(|_| "***".to_string()),
        default_repo: config.sync().git().default_repo().map(|s| s.to_string()),
        schedule_enabled: config.sync().schedule().enabled(),
        schedule_cron: config.sync().schedule().cron().to_string(),
        sync_jobs: config.sync().schedule().sync_jobs(),
        sync_companies: config.sync().schedule().sync_companies(),
    };

    Ok(ApiResponse::success(Some(sync_config)))
}
