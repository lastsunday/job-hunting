use framework::{error::critical_code::CriticalErrorCode, prelude::*};

#[error]
pub enum FileErrorCode {
    FileNotFound = 509001,
}

use crate::AppState;
use axum::{debug_handler, extract::Path, extract::State};
use axum::body::Body;
use axum::response::Response;
use chrono::{DateTime, FixedOffset};
use entity::file::{self, Entity as File};
use entity::schema::date_time_with_time_zone_or_null_schema;
use framework::{
    data::{ApiPageResult, ApiResponse, PageParam, empty_string_as_none, valid::ValidJson},
    error::ApiResult,
    middleware::get_auth_layer,
};
use sea_orm::{
    ColumnTrait, EntityTrait, IntoActiveModel, PaginatorTrait, QueryFilter, QueryOrder, QueryTrait,
    Set,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use utoipa_axum::{
    router::{OpenApiRouter, UtoipaMethodRouterExt},
    routes,
};
use validator::Validate;

const TAG: &str = "file";

pub fn create_routes(state: AppState) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(search).with_state(state.clone()))
        .routes(routes!(get_content).with_state(state.clone()))
        .routes(routes!(logic_delete).with_state(state))
        .route_layer(get_auth_layer())
}

#[derive(Default, Deserialize, Serialize, Debug, Clone, Validate, ToSchema)]
pub struct SearchFileParam {
    #[validate(nested)]
    pub page: PageParam,
    pub id: Option<String>,
    pub name: Option<String>,
    pub sha: Option<String>,
    pub is_delete: Option<bool>,
    #[serde(default, deserialize_with = "empty_string_as_none")]
    pub start_datetime_for_create: Option<DateTime<FixedOffset>>,
    #[serde(default, deserialize_with = "empty_string_as_none")]
    pub end_datetime_for_create: Option<DateTime<FixedOffset>>,
    #[serde(default, deserialize_with = "empty_string_as_none")]
    pub start_datetime_for_update: Option<DateTime<FixedOffset>>,
    #[serde(default, deserialize_with = "empty_string_as_none")]
    pub end_datetime_for_update: Option<DateTime<FixedOffset>>,
    pub order_by: Option<String>,
    pub order_dir: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct FileItem {
    pub id: String,
    pub name: Option<String>,
    pub sha: Option<String>,
    pub size: Option<i64>,
    pub is_delete: Option<bool>,
    #[schema(schema_with = date_time_with_time_zone_or_null_schema)]
    pub create_datetime: Option<DateTime<FixedOffset>>,
    #[schema(schema_with = date_time_with_time_zone_or_null_schema)]
    pub update_datetime: Option<DateTime<FixedOffset>>,
}

#[derive(Deserialize, Serialize, Debug, Clone, Validate, ToSchema)]
pub struct LogicDeleteParam {
    pub ids: Vec<String>,
}

#[debug_handler]
#[utoipa::path(post, path = "/file/search", tag = TAG, security(()), request_body = SearchFileParam, responses(
    (status = OK, body = ApiResponse<ApiPageResult<FileItem>>)
))]
pub async fn search(
    State(AppState { conn, .. }): State<AppState>,
    ValidJson(param): ValidJson<SearchFileParam>,
) -> ApiResult<ApiResponse<ApiPageResult<FileItem>>> {
    let num = param.page.num;
    let size = param.page.size;
    let order_by = param.order_by.clone();
    let order_dir = param.order_dir.clone();

    let query = File::find().apply_if(Some(param), |query, v| {
        query
            .apply_if(v.id, |query, v| query.filter(file::Column::Id.eq(v)))
            .apply_if(v.name, |query, v| {
                query.filter(file::Column::Name.like(format!("%{}%", v)))
            })
            .apply_if(v.sha, |query, v| {
                query.filter(file::Column::Sha.like(format!("%{}%", v)))
            })
            .apply_if(v.is_delete, |query, v| {
                query.filter(file::Column::IsDelete.eq(v))
            })
            .apply_if(v.start_datetime_for_create, |query, v| {
                query.filter(file::Column::CreateDatetime.gte(v))
            })
            .apply_if(v.end_datetime_for_create, |query, v| {
                query.filter(file::Column::CreateDatetime.lte(v))
            })
            .apply_if(v.start_datetime_for_update, |query, v| {
                query.filter(file::Column::UpdateDatetime.gte(v))
            })
            .apply_if(v.end_datetime_for_update, |query, v| {
                query.filter(file::Column::UpdateDatetime.lte(v))
            })
    });

    let order_by = order_by.as_deref().unwrap_or("update_datetime");
    let order_dir = order_dir.as_deref().unwrap_or("desc");
    let is_asc = order_dir == "asc";

    let paginate = match order_by {
        "create_datetime" => {
            if is_asc {
                query
                    .clone()
                    .order_by_asc(file::Column::CreateDatetime)
                    .order_by_asc(file::Column::Id)
                    .paginate(&conn, size)
            } else {
                query
                    .clone()
                    .order_by_desc(file::Column::CreateDatetime)
                    .order_by_asc(file::Column::Id)
                    .paginate(&conn, size)
            }
        }
        _ => {
            if is_asc {
                query
                    .clone()
                    .order_by_asc(file::Column::UpdateDatetime)
                    .order_by_asc(file::Column::Id)
                    .paginate(&conn, size)
            } else {
                query
                    .clone()
                    .order_by_desc(file::Column::UpdateDatetime)
                    .order_by_asc(file::Column::Id)
                    .paginate(&conn, size)
            }
        }
    };

    let total = paginate.num_items().await?;
    let items = paginate.fetch_page(num - 1).await?;

    let file_items: Vec<FileItem> = items
        .into_iter()
        .map(|f| FileItem {
            id: f.id,
            name: f.name,
            sha: f.sha,
            size: f.size,
            is_delete: f.is_delete,
            create_datetime: f.create_datetime,
            update_datetime: f.update_datetime,
        })
        .collect();

    Ok(ApiResponse::success(Some(ApiPageResult::new(file_items, total))))
}

#[debug_handler]
#[utoipa::path(get, path = "/file/{id}/content", tag = TAG, security(()), responses(
    (status = 200, description = "File content as octet-stream")
))]
pub async fn get_content(
    State(AppState { conn, .. }): State<AppState>,
    Path(id): Path<String>,
) -> ApiResult<Response> {
    let file = File::find_by_id(&id)
        .one(&conn)
        .await?
        .ok_or(err!(FileErrorCode::FileNotFound))?;

    let content = file.content.ok_or(err!(FileErrorCode::FileNotFound))?;
    let file_name = file.name.unwrap_or_else(|| "file.bin".to_string());

    let response = Response::builder()
        .header("Content-Type", "application/octet-stream")
        .header(
            "Content-Disposition",
            format!("attachment; filename=\"{}\"", file_name),
        )
        .header("Content-Length", content.len().to_string())
        .body(Body::from(content))
        .map_err(|_| err!(CriticalErrorCode::InternalError))?;

    Ok(response)
}

#[debug_handler]
#[utoipa::path(put, path = "/file/logic_delete", tag = TAG, security(()), request_body = LogicDeleteParam, responses(
    (status = OK, body = ApiResponse<String>)
))]
pub async fn logic_delete(
    State(AppState { conn, .. }): State<AppState>,
    ValidJson(param): ValidJson<LogicDeleteParam>,
) -> ApiResult<ApiResponse<String>> {
    for id in &param.ids {
        let file = File::find_by_id(id)
            .one(&conn)
            .await?
            .ok_or(err!(FileErrorCode::FileNotFound))?;

        let mut active: file::ActiveModel = file.into_active_model();
        active.is_delete = Set(Some(true));
        active.content = Set(None);
        active.update_datetime = Set(Some(chrono::Utc::now().into()));
        File::update(active).exec(&conn).await?;
    }

    Ok(ApiResponse::success(Some("Deleted".to_string())))
}
