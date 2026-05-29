use framework::{error::critical_code::CriticalErrorCode, prelude::*};

#[error]
pub enum JobErrorCode {
    TitleRequired = 502001,
    UrlRequired = 502002,
    CompanyNameRequired = 502003,
    IdIsEmpty = 502004,
}

use crate::AppState;
use axum::{debug_handler, extract::Extension, extract::Path, extract::State};
use entity::job::{self, Entity as Job};
use framework::{
    auth::Principal,
    data::{ApiPageResult, ApiResponse, PageParam, empty_string_as_none, valid::ValidJson},
    error::ApiResult,
    middleware::get_auth_layer,
};
use sea_orm::{
    ColumnTrait, EntityTrait, IntoActiveModel, PaginatorTrait, QueryFilter, QueryOrder, QueryTrait,
};
use serde::{Deserialize, Serialize};
use service::util::hash::gen_add_or_update_uri;
use service::{
    common::FileParser,
    sync::{ImportError, JobImporter},
};
use utoipa::ToSchema;
use utoipa_axum::{
    router::{OpenApiRouter, UtoipaMethodRouterExt},
    routes,
};

const TAG: &str = "job";

const JOB_CSV_VERSION: usize = 1;

fn convert_job_to_csv_data(id: &str, param: &CreateJobRequest) -> Vec<Vec<String>> {
    let headers = FileParser::get_job_headers(JOB_CSV_VERSION);
    let row = vec![
        id.to_string(),
        param.platform.clone().unwrap_or_default(),
        param.url.clone().unwrap_or_default(),
        param.name.clone().unwrap_or_default(),
        param.company_name.clone().unwrap_or_default(),
        param.is_full_company_name.unwrap_or(false).to_string(),
        param.location_name.clone().unwrap_or_default(),
        param.address.clone().unwrap_or_default(),
        param.longitude.map(|v| v.to_string()).unwrap_or_default(),
        param.latitude.map(|v| v.to_string()).unwrap_or_default(),
        param.description.clone().unwrap_or_default(),
        param.degree_name.clone().unwrap_or_default(),
        param.year.map(|v| v.to_string()).unwrap_or_default(),
        param.skill_tag.clone().unwrap_or_default(),
        param.welfare_tag.clone().unwrap_or_default(),
        param.salary_min.map(|v| v.to_string()).unwrap_or_default(),
        param.salary_max.map(|v| v.to_string()).unwrap_or_default(),
        param
            .salary_total_month
            .map(|v| v.to_string())
            .unwrap_or_default(),
        param
            .first_publish_datetime
            .map(|v| v.to_rfc3339())
            .unwrap_or_default(),
        param.boss_name.clone().unwrap_or_default(),
        param.boss_company_name.clone().unwrap_or_default(),
        param.boss_position.clone().unwrap_or_default(),
        chrono::Utc::now().to_rfc3339(),
        chrono::Utc::now().to_rfc3339(),
    ];
    vec![headers, row]
}

fn convert_update_job_to_csv_data(
    id: &str,
    param: &UpdateJobRequest,
    existing: &job::Model,
) -> Vec<Vec<String>> {
    let headers = FileParser::get_job_headers(JOB_CSV_VERSION);
    let row = vec![
        id.to_string(),
        param
            .platform
            .clone()
            .or_else(|| existing.platform.clone())
            .unwrap_or_default(),
        param
            .url
            .clone()
            .or_else(|| existing.url.clone())
            .unwrap_or_default(),
        param
            .name
            .clone()
            .or_else(|| existing.name.clone())
            .unwrap_or_default(),
        param
            .company_name
            .clone()
            .or_else(|| existing.company_name.clone())
            .unwrap_or_default(),
        param
            .is_full_company_name
            .or(existing.is_full_company_name)
            .unwrap_or(false)
            .to_string(),
        param
            .location_name
            .clone()
            .or_else(|| existing.location_name.clone())
            .unwrap_or_default(),
        param
            .address
            .clone()
            .or_else(|| existing.address.clone())
            .unwrap_or_default(),
        param
            .longitude
            .or(existing.longitude)
            .map(|v| v.to_string())
            .unwrap_or_default(),
        param
            .latitude
            .or(existing.latitude)
            .map(|v| v.to_string())
            .unwrap_or_default(),
        param
            .description
            .clone()
            .or_else(|| existing.description.clone())
            .unwrap_or_default(),
        param
            .degree_name
            .clone()
            .or_else(|| existing.degree_name.clone())
            .unwrap_or_default(),
        param
            .year
            .or(existing.year)
            .map(|v| v.to_string())
            .unwrap_or_default(),
        param
            .skill_tag
            .clone()
            .or_else(|| existing.skill_tag.clone())
            .unwrap_or_default(),
        param
            .welfare_tag
            .clone()
            .or_else(|| existing.welfare_tag.clone())
            .unwrap_or_default(),
        param
            .salary_min
            .or(existing.salary_min)
            .map(|v| v.to_string())
            .unwrap_or_default(),
        param
            .salary_max
            .or(existing.salary_max)
            .map(|v| v.to_string())
            .unwrap_or_default(),
        param
            .salary_total_month
            .or(existing.salary_total_month)
            .map(|v| v.to_string())
            .unwrap_or_default(),
        param
            .first_publish_datetime
            .or(existing.first_publish_datetime)
            .map(|v| v.to_rfc3339())
            .unwrap_or_default(),
        param
            .boss_name
            .clone()
            .or_else(|| existing.boss_name.clone())
            .unwrap_or_default(),
        param
            .boss_company_name
            .clone()
            .or_else(|| existing.boss_company_name.clone())
            .unwrap_or_default(),
        param
            .boss_position
            .clone()
            .or_else(|| existing.boss_position.clone())
            .unwrap_or_default(),
        existing
            .first_scan_datetime
            .map(|v| v.to_rfc3339())
            .unwrap_or_default(),
        chrono::Utc::now().to_rfc3339(),
    ];
    vec![headers, row]
}

pub fn create_routes(state: AppState) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(search).with_state(state.clone()))
        .routes(routes!(get_by_id).with_state(state.clone()))
        .routes(routes!(create).with_state(state.clone()))
        .routes(routes!(update).with_state(state.clone()))
        .route(
            "/job/{id}",
            axum::routing::delete(delete_job).with_state(state),
        )
        .route_layer(get_auth_layer())
}

#[debug_handler]
#[utoipa::path(post, path = "/job/search",tag=TAG,security(()),request_body = SearchParam,responses(
    (status=OK,body=ApiResponse<ApiPageResult<job::Model>>)
))]
pub async fn search(
    State(AppState { conn }): State<AppState>,
    ValidJson(param): ValidJson<SearchParam>,
) -> ApiResult<ApiResponse<ApiPageResult<job::Model>>> {
    let num = param.page.num;
    let size = param.page.size;
    let order_by = param.order_by.clone();
    let order_dir = param.order_dir.clone();
    let selection = Job::find().apply_if(Some(param), |query, v| {
        query
            .apply_if(v.name, |query, v| {
                query.filter(job::Column::Name.like(format!("%{}%", v)))
            })
            .apply_if(v.company_name, |query, v| {
                query.filter(job::Column::CompanyName.like(format!("%{}%", v)))
            })
            .apply_if(v.platform, |query, v| {
                query.filter(job::Column::Platform.like(format!("%{}%", v)))
            })
            .apply_if(v.address, |query, v| {
                query.filter(job::Column::Address.like(format!("%{}%", v)))
            })
            .apply_if(v.salary, |query, v| {
                query.filter(job::Column::SalaryMax.gte(v))
            })
            .apply_if(v.first_publish_datetime_start, |query, v| {
                query.filter(job::Column::FirstPublishDatetime.gte(v))
            })
            .apply_if(v.first_publish_datetime_end, |query, v| {
                query.filter(job::Column::FirstPublishDatetime.lt(v))
            })
            .apply_if(v.first_scan_datetime_start, |query, v| {
                query.filter(job::Column::FirstScanDatetime.gte(v))
            })
            .apply_if(v.first_scan_datetime_end, |query, v| {
                query.filter(job::Column::FirstScanDatetime.lt(v))
            })
            .apply_if(v.create_datetime_start, |query, v| {
                query.filter(job::Column::CreateDatetime.gte(v))
            })
            .apply_if(v.create_datetime_end, |query, v| {
                query.filter(job::Column::CreateDatetime.lt(v))
            })
    });
    let order_by = order_by.as_deref().unwrap_or("update_datetime");
    let order_dir = order_dir.as_deref().unwrap_or("desc");
    let is_asc = order_dir == "asc";
    let paginate = match order_by {
        "first_publish_datetime" => {
            if is_asc {
                selection
                    .clone()
                    .order_by_asc(job::Column::FirstPublishDatetime)
                    .order_by_asc(job::Column::Id)
                    .paginate(&conn, size)
            } else {
                selection
                    .clone()
                    .order_by_desc(job::Column::FirstPublishDatetime)
                    .order_by_asc(job::Column::Id)
                    .paginate(&conn, size)
            }
        }
        "first_scan_datetime" => {
            if is_asc {
                selection
                    .clone()
                    .order_by_asc(job::Column::FirstScanDatetime)
                    .order_by_asc(job::Column::Id)
                    .paginate(&conn, size)
            } else {
                selection
                    .clone()
                    .order_by_desc(job::Column::FirstScanDatetime)
                    .order_by_asc(job::Column::Id)
                    .paginate(&conn, size)
            }
        }
        _ => {
            if is_asc {
                selection
                    .clone()
                    .order_by_asc(job::Column::UpdateDatetime)
                    .order_by_asc(job::Column::Id)
                    .paginate(&conn, size)
            } else {
                selection
                    .clone()
                    .order_by_desc(job::Column::UpdateDatetime)
                    .order_by_asc(job::Column::Id)
                    .paginate(&conn, size)
            }
        }
    };
    let total = paginate.num_items().await?;
    let items = paginate.fetch_page(num - 1).await?;
    Ok(ApiResponse::success(Some(ApiPageResult::new(items, total))))
}

#[debug_handler]
#[utoipa::path(get, path = "/job/{id}",tag=TAG,security(()),responses(
    (status=OK,body=ApiResponse<job::Model>)
))]
pub async fn get_by_id(
    State(AppState { conn }): State<AppState>,
    Path(id): Path<String>,
) -> ApiResult<ApiResponse<job::Model>> {
    let job = Job::find_by_id(&id)
        .one(&conn)
        .await?
        .ok_or(err!(CriticalErrorCode::ResourceNotFound))?;
    Ok(ApiResponse::success(Some(job)))
}

#[debug_handler]
#[utoipa::path(post, path = "/job",tag=TAG,security(()),request_body = CreateJobRequest,responses(
    (status=OK,body=ApiResponse<job::Model>)
))]
pub async fn create(
    State(AppState { conn }): State<AppState>,
    Extension(principal): Extension<Principal>,
    ValidJson(param): ValidJson<CreateJobRequest>,
) -> ApiResult<ApiResponse<job::Model>> {
    let job_id = match &param.id {
        Some(id) => {
            if id.trim().is_empty() {
                Err(err!(JobErrorCode::IdIsEmpty))
            } else {
                Ok(id.to_string())
            }
        }
        None => Ok(xid::new().to_string()),
    }?;
    let csv_data = convert_job_to_csv_data(&job_id, &param);
    let uri = gen_add_or_update_uri(&principal.name, JOB_CSV_VERSION, &csv_data);

    JobImporter::import(&conn, csv_data, &uri)
        .await
        .map_err(|e: service::sync::ImportError| match e {
            ImportError::Internal(error) => {
                err!(CriticalErrorCode::InternalError).with_extra(error.to_string())
            }
        })?;
    let job = Job::find_by_id(&job_id)
        .one(&conn)
        .await?
        .ok_or(err!(JobErrorCode::TitleRequired))?;
    Ok(ApiResponse::success(Some(job)))
}

#[debug_handler]
#[utoipa::path(put, path = "/job/{id}",tag=TAG,security(()),request_body = UpdateJobRequest,responses(
    (status=OK,body=ApiResponse<job::Model>)
))]
pub async fn update(
    State(AppState { conn }): State<AppState>,
    Extension(principal): Extension<Principal>,
    Path(id): Path<String>,
    ValidJson(param): ValidJson<UpdateJobRequest>,
) -> ApiResult<ApiResponse<job::Model>> {
    let existing = Job::find_by_id(&id)
        .one(&conn)
        .await?
        .ok_or(err!(CriticalErrorCode::ResourceNotFound))?;

    let csv_data = convert_update_job_to_csv_data(&id, &param, &existing);
    let uri = gen_add_or_update_uri(&principal.name, JOB_CSV_VERSION, &csv_data);

    JobImporter::import(&conn, csv_data, &uri)
        .await
        .map_err(|e: service::sync::ImportError| match e {
            ImportError::Internal(error) => {
                err!(CriticalErrorCode::InternalError).with_extra(error.to_string())
            }
        })?;
    let job = Job::find_by_id(&id)
        .one(&conn)
        .await?
        .ok_or(err!(CriticalErrorCode::ResourceNotFound))?;
    Ok(ApiResponse::success(Some(job)))
}

#[debug_handler]
#[utoipa::path(delete, path = "/job/{id}",tag=TAG,security(()),responses(
    (status=OK,body=ApiResponse<String>)
))]
pub async fn delete_job(
    State(AppState { conn }): State<AppState>,
    Path(id): Path<String>,
) -> ApiResult<ApiResponse<String>> {
    let job = Job::find_by_id(&id)
        .one(&conn)
        .await?
        .ok_or(err!(CriticalErrorCode::ResourceNotFound))?;
    Job::delete(job.into_active_model()).exec(&conn).await?;
    Ok(ApiResponse::success(Some("Deleted".to_string())))
}

use chrono::{DateTime, FixedOffset};
use validator::Validate;

#[derive(Default, Deserialize, Serialize, Debug, Clone, Validate, ToSchema)]
pub struct SearchParam {
    #[validate(nested)]
    pub page: PageParam,
    pub name: Option<String>,
    pub company_name: Option<String>,
    pub platform: Option<String>,
    pub salary: Option<f32>,
    pub address: Option<String>,
    #[serde(default, deserialize_with = "empty_string_as_none")]
    pub first_publish_datetime_start: Option<DateTime<FixedOffset>>,
    #[serde(default, deserialize_with = "empty_string_as_none")]
    pub first_publish_datetime_end: Option<DateTime<FixedOffset>>,
    #[serde(default, deserialize_with = "empty_string_as_none")]
    pub first_scan_datetime_start: Option<DateTime<FixedOffset>>,
    #[serde(default, deserialize_with = "empty_string_as_none")]
    pub first_scan_datetime_end: Option<DateTime<FixedOffset>>,
    #[serde(default, deserialize_with = "empty_string_as_none")]
    pub create_datetime_start: Option<DateTime<FixedOffset>>,
    #[serde(default, deserialize_with = "empty_string_as_none")]
    pub create_datetime_end: Option<DateTime<FixedOffset>>,
    pub order_by: Option<String>,
    pub order_dir: Option<String>,
}

#[derive(Default, Deserialize, Serialize, Debug, Clone, Validate, ToSchema)]
pub struct CreateJobRequest {
    pub id: Option<String>,
    pub platform: Option<String>,
    pub url: Option<String>,
    pub name: Option<String>,
    pub company_name: Option<String>,
    pub location_name: Option<String>,
    pub address: Option<String>,
    pub longitude: Option<f64>,
    pub latitude: Option<f64>,
    pub description: Option<String>,
    pub degree_name: Option<String>,
    pub year: Option<i32>,
    pub salary_min: Option<f32>,
    pub salary_max: Option<f32>,
    pub salary_total_month: Option<i32>,
    #[serde(default, deserialize_with = "empty_string_as_none")]
    pub first_publish_datetime: Option<DateTime<FixedOffset>>,
    #[serde(default, deserialize_with = "empty_string_as_none")]
    pub first_scan_datetime: Option<DateTime<FixedOffset>>,
    pub boss_name: Option<String>,
    pub boss_company_name: Option<String>,
    pub boss_position: Option<String>,
    pub is_full_company_name: Option<bool>,
    pub skill_tag: Option<String>,
    pub welfare_tag: Option<String>,
}

#[derive(Default, Deserialize, Serialize, Debug, Clone, Validate, ToSchema)]
pub struct UpdateJobRequest {
    pub platform: Option<String>,
    pub url: Option<String>,
    pub name: Option<String>,
    pub company_name: Option<String>,
    pub location_name: Option<String>,
    pub address: Option<String>,
    pub longitude: Option<f64>,
    pub latitude: Option<f64>,
    pub description: Option<String>,
    pub degree_name: Option<String>,
    pub year: Option<i32>,
    pub salary_min: Option<f32>,
    pub salary_max: Option<f32>,
    pub salary_total_month: Option<i32>,
    #[serde(default, deserialize_with = "empty_string_as_none")]
    pub first_publish_datetime: Option<DateTime<FixedOffset>>,
    pub boss_name: Option<String>,
    pub boss_company_name: Option<String>,
    pub boss_position: Option<String>,
    pub is_full_company_name: Option<bool>,
    pub skill_tag: Option<String>,
    pub welfare_tag: Option<String>,
}
