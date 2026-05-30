use framework::error::critical_code::CriticalErrorCode;
use framework::prelude::*;

#[error]
pub enum SyncErrorCode {
    FileInvalid = 505001,
    ExcelParseFailed = 505002,
    ImportFailed = 505003,
    DataTypeInvalid = 505004,
}

use crate::AppState;
use axum::extract::Extension;
use axum::{debug_handler, extract::State};
use base64::Engine;
use entity::{company::Entity as Company, job::Entity as Job};
use framework::{
    auth::Principal,
    data::{ApiResponse, valid::ValidJson},
    error::ApiResult,
    middleware::get_auth_layer,
};
use sea_orm::{EntityTrait, Order, PaginatorTrait, QueryOrder, TransactionTrait};
use serde::Deserialize;
use utoipa::ToSchema;
use utoipa_axum::{
    router::{OpenApiRouter, UtoipaMethodRouterExt},
    routes,
};

use service::common::FileParser;
use service::sync::{CompanyImporter, ImportError, JobImporter, SyncStatus, types::ImportResult};

const TAG: &str = "sync";

pub fn create_routes(state: AppState) -> OpenApiRouter {
    let sync_state = SyncState::new(state);

    OpenApiRouter::new()
        .routes(routes!(get_sync_status).with_state(sync_state.clone()))
        .routes(routes!(import_file).with_state(sync_state.clone()))
        .route_layer(get_auth_layer())
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
    Extension(principal): Extension<Principal>,
    ValidJson(param): ValidJson<ImportFileRequest>,
) -> ApiResult<ApiResponse<ImportResult>> {
    let data = base64::engine::general_purpose::STANDARD
        .decode(&param.file)
        .map_err(|_| err!(SyncErrorCode::FileInvalid))?;
    let hash = FileParser::gen_file_sha256(&data);
    let uri = format!("data://{}@system/{}", principal.name, hash);
    let rows = FileParser::parse_excel(&data).map_err(|e| match e {
        service::common::FileError::FileEmpty => err!(SyncErrorCode::FileInvalid),
        service::common::FileError::ExcelParseFailed(_) => {
            err!(SyncErrorCode::ExcelParseFailed)
        }
        service::common::FileError::NoSheetsFound => err!(SyncErrorCode::ExcelParseFailed),
        service::common::FileError::DataTypeInvalid(_) => {
            err!(SyncErrorCode::DataTypeInvalid)
        }
        service::common::FileError::Internal(error) => {
            err!(CriticalErrorCode::InternalError).with_extra(error.to_string())
        }
    })?;
    let result = match param.data_type.as_str() {
        "job" => Ok(conn(&state)
            .transaction::<_, _, anyhow::Error>(|txn| {
                Box::pin(async move { Ok(JobImporter::import(txn, rows, uri.as_str()).await?) })
            })
            .await),
        "company" => Ok(conn(&state)
            .transaction::<_, _, anyhow::Error>(|txn| {
                Box::pin(async move { Ok(CompanyImporter::import(txn, rows, uri.as_str()).await?) })
            })
            .await),
        _ => Err(ImportError::Internal(anyhow::anyhow!("invalid data type"))),
    }
    .map_err(|e| match e {
        ImportError::Internal(error) => {
            err!(CriticalErrorCode::InternalError).with_extra(error.to_string())
        }
    })?;
    match result {
        Ok(result) => Ok(ApiResponse::success(Some(result))),
        Err(e) => match e {
            sea_orm::TransactionError::Connection(db_err) => {
                Err(err!(CriticalErrorCode::InternalError).with_extra(db_err.to_string()))
            }
            sea_orm::TransactionError::Transaction(error) => {
                Err(err!(CriticalErrorCode::InternalError).with_extra(error.to_string()))
            }
        },
    }
}

#[debug_handler]
#[utoipa::path(get, path = "/sync/status", tag = TAG, security(()), responses(
    (status = OK, body = ApiResponse<SyncStatus>)
))]
pub(crate) async fn get_sync_status(
    State(state): State<SyncState>,
) -> ApiResult<ApiResponse<SyncStatus>> {
    let conn = conn(&state);

    let last_job = Job::find()
        .order_by(entity::job::Column::CreateDatetime, Order::Desc)
        .one(conn)
        .await
        .map_err(|_| err!(SyncErrorCode::ImportFailed))?
        .and_then(|j| j.create_datetime);

    let last_company = Company::find()
        .order_by(entity::company::Column::CreateDatetime, Order::Desc)
        .one(conn)
        .await
        .map_err(|_| err!(SyncErrorCode::ImportFailed))?
        .and_then(|c| c.create_datetime);

    let total_jobs: i64 = Job::find()
        .count(conn)
        .await
        .map_err(|_| err!(SyncErrorCode::ImportFailed))? as i64;

    let total_companies: i64 = Company::find()
        .count(conn)
        .await
        .map_err(|_| err!(SyncErrorCode::ImportFailed))? as i64;

    Ok(ApiResponse::success(Some(SyncStatus {
        last_sync_job: last_job,
        last_sync_company: last_company,
        scheduler_running: false,
        total_jobs,
        total_companies,
    })))
}
