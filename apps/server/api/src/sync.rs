use base64::Engine;
use crate::AppState;
use axum::{debug_handler, extract::State};
use entity::{company::Entity as Company, job::Entity as Job};
use framework::{
    data::{ApiResponse, valid::ValidJson},
    error::ApiResult,
};
use sea_orm::{EntityTrait, Order, PaginatorTrait, QueryOrder};
use serde::Deserialize;
use utoipa::ToSchema;
use utoipa_axum::{
    router::{OpenApiRouter, UtoipaMethodRouterExt},
    routes,
};

use service::sync::{CompanyImporter, FileParser, JobImporter, SyncStatus, types::ImportResult};

const TAG: &str = "sync";

pub fn create_routes(state: AppState) -> OpenApiRouter {
    let sync_state = SyncState::new(state);

    OpenApiRouter::new()
        .routes(routes!(get_sync_status).with_state(sync_state.clone()))
        .routes(routes!(import_file).with_state(sync_state.clone()))
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

#[derive(Debug, Deserialize, ToSchema, validator::Validate)]
pub struct ImportFileRequest {
    pub data_type: String,
    #[schema(value_type = String)]
    pub file: String,
}

#[debug_handler]
#[utoipa::path(post, path = "/sync/file/import", tag = TAG, security(()), request_body = ImportFileRequest, responses(
    (status = OK, body = ApiResponse<ImportResult>)
))]
pub(crate) async fn import_file(
    State(state): State<SyncState>,
    ValidJson(param): ValidJson<ImportFileRequest>,
) -> ApiResult<ApiResponse<ImportResult>> {
    let data = base64::engine::general_purpose::STANDARD.decode(&param.file)
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
        _ => {
            return Err(framework::error::ApiError::Validation(
                "Invalid data type".to_string(),
            ));
        }
    }
    .map_err(|e| framework::error::ApiError::Validation(e))?;

    Ok(ApiResponse::success(Some(result)))
}

#[debug_handler]
#[utoipa::path(get, path = "/sync/status", tag = TAG, security(()), responses(
    (status = OK, body = ApiResponse<SyncStatus>)
))]
pub(crate) async fn get_sync_status(State(state): State<SyncState>) -> ApiResult<ApiResponse<SyncStatus>> {
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
        .map_err(|e| framework::error::ApiError::Biz(e.to_string()))?
        as i64;

    let total_companies: i64 = Company::find()
        .count(conn)
        .await
        .map_err(|e| framework::error::ApiError::Biz(e.to_string()))?
        as i64;

    Ok(ApiResponse::success(Some(SyncStatus {
        last_sync_job: last_job,
        last_sync_company: last_company,
        scheduler_running: false,
        total_jobs,
        total_companies,
    })))
}
