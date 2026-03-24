use crate::AppState;
use axum::{debug_handler, extract::State, extract::Path};
use entity::job::{self, Entity as Job};
use framework::{
    data::{ApiPageResult, ApiResponse, PageParam, valid::ValidJson},
    error::ApiResult,
};
use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, QueryTrait, ActiveValue::Set};
use utoipa::ToSchema;
use utoipa_axum::{
    router::{OpenApiRouter, UtoipaMethodRouterExt},
    routes,
};

const TAG: &str = "job";

pub fn create_routes(state: AppState) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(search).with_state(state.clone()))
        .routes(routes!(get_by_id).with_state(state.clone()))
        .routes(routes!(create).with_state(state.clone()))
        .routes(routes!(update).with_state(state))
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
    let selection = Job::find().apply_if(Some(param), |query, v| {
        query
            .apply_if(v.name, |query, v| {
                query.filter(job::Column::Name.like(format!("%{}%", v)))
            })
            .apply_if(v.address, |query, v| {
                query.filter(job::Column::Address.like(format!("%{}%", v)))
            })
            .apply_if(v.salary, |query, v| {
                query.filter(job::Column::SalaryMax.gte(v))
            })
            .apply_if(v.publish_datetime_start, |query, v| {
                query.filter(job::Column::FirstPublishDatetime.gte(v))
            })
            .apply_if(v.publish_datetime_end, |query, v| {
                query.filter(job::Column::FirstPublishDatetime.lt(v))
            })
            .apply_if(v.create_datetime_start, |query, v| {
                query.filter(job::Column::CreateDatetime.gte(v))
            })
            .apply_if(v.create_datetime_end, |query, v| {
                query.filter(job::Column::CreateDatetime.lt(v))
            })
    });
    let paginate = selection
        .clone()
        .order_by_desc(job::Column::UpdateDatetime)
        .order_by_asc(job::Column::Id)
        .paginate(&conn, size);
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
        .ok_or_else(|| framework::error::ApiError::NotFound)?;
    Ok(ApiResponse::success(Some(job)))
}

#[debug_handler]
#[utoipa::path(post, path = "/job",tag=TAG,security(()),request_body = CreateJobRequest,responses(
    (status=OK,body=ApiResponse<job::Model>)
))]
pub async fn create(
    State(AppState { conn }): State<AppState>,
    ValidJson(param): ValidJson<CreateJobRequest>,
) -> ApiResult<ApiResponse<job::Model>> {
    let now: chrono::DateTime<chrono::Utc> = chrono::Utc::now();
    let active_model = job::ActiveModel {
        id: Set(param.id.unwrap_or_else(|| xid::new().to_string())),
        platform: Set(param.platform),
        url: Set(param.url),
        name: Set(param.name),
        company_name: Set(param.company_name),
        location_name: Set(param.location_name),
        address: Set(param.address),
        longitude: Set(param.longitude),
        latitude: Set(param.latitude),
        description: Set(param.description),
        degree_name: Set(param.degree_name),
        year: Set(param.year),
        salary_min: Set(param.salary_min),
        salary_max: Set(param.salary_max),
        salary_total_month: Set(param.salary_total_month),
        first_publish_datetime: Set(param.first_publish_datetime),
        boss_name: Set(param.boss_name),
        boss_company_name: Set(param.boss_company_name),
        boss_position: Set(param.boss_position),
        create_datetime: Set(Some(now.into())),
        update_datetime: Set(Some(now.into())),
        is_full_company_name: Set(param.is_full_company_name),
        skill_tag: Set(param.skill_tag),
        welfare_tag: Set(param.welfare_tag),
        ..Default::default()
    };
    let result = Job::insert(active_model).exec(&conn).await?;
    let job = Job::find_by_id(result.last_insert_id)
        .one(&conn)
        .await?
        .ok_or_else(|| framework::error::ApiError::NotFound)?;
    Ok(ApiResponse::success(Some(job)))
}

#[debug_handler]
#[utoipa::path(put, path = "/job/{id}",tag=TAG,security(()),request_body = UpdateJobRequest,responses(
    (status=OK,body=ApiResponse<job::Model>)
))]
pub async fn update(
    State(AppState { conn }): State<AppState>,
    Path(id): Path<String>,
    ValidJson(param): ValidJson<UpdateJobRequest>,
) -> ApiResult<ApiResponse<job::Model>> {
    let existing = Job::find_by_id(&id)
        .one(&conn)
        .await?
        .ok_or_else(|| framework::error::ApiError::NotFound)?;
    
    let active_model = job::ActiveModel {
        id: Set(id.clone()),
        platform: Set(param.platform.or(existing.platform)),
        url: Set(param.url.or(existing.url)),
        name: Set(param.name.or(existing.name)),
        company_name: Set(param.company_name.or(existing.company_name)),
        location_name: Set(param.location_name.or(existing.location_name)),
        address: Set(param.address.or(existing.address)),
        longitude: Set(param.longitude.or(existing.longitude)),
        latitude: Set(param.latitude.or(existing.latitude)),
        description: Set(param.description.or(existing.description)),
        degree_name: Set(param.degree_name.or(existing.degree_name)),
        year: Set(param.year.or(existing.year)),
        salary_min: Set(param.salary_min.or(existing.salary_min)),
        salary_max: Set(param.salary_max.or(existing.salary_max)),
        salary_total_month: Set(param.salary_total_month.or(existing.salary_total_month)),
        first_publish_datetime: Set(param.first_publish_datetime.or(existing.first_publish_datetime)),
        boss_name: Set(param.boss_name.or(existing.boss_name)),
        boss_company_name: Set(param.boss_company_name.or(existing.boss_company_name)),
        boss_position: Set(param.boss_position.or(existing.boss_position)),
        update_datetime: Set(Some(chrono::Utc::now().into())),
        is_full_company_name: Set(param.is_full_company_name.or(existing.is_full_company_name)),
        skill_tag: Set(param.skill_tag.or(existing.skill_tag)),
        welfare_tag: Set(param.welfare_tag.or(existing.welfare_tag)),
        ..Default::default()
    };
    Job::update(active_model).exec(&conn).await?;
    let job = Job::find_by_id(&id)
        .one(&conn)
        .await?
        .ok_or_else(|| framework::error::ApiError::NotFound)?;
    Ok(ApiResponse::success(Some(job)))
}

use chrono::{DateTime, FixedOffset};
use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Default, Deserialize, Serialize, Debug, Clone, Validate, ToSchema)]
pub struct SearchParam {
    #[validate(nested)]
    pub page: PageParam,
    pub name: Option<String>,
    pub salary: Option<f32>,
    pub address: Option<String>,
    pub publish_datetime_start: Option<DateTime<FixedOffset>>,
    pub publish_datetime_end: Option<DateTime<FixedOffset>>,
    pub create_datetime_start: Option<DateTime<FixedOffset>>,
    pub create_datetime_end: Option<DateTime<FixedOffset>>,
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
    pub first_publish_datetime: Option<DateTime<FixedOffset>>,
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
    pub first_publish_datetime: Option<DateTime<FixedOffset>>,
    pub boss_name: Option<String>,
    pub boss_company_name: Option<String>,
    pub boss_position: Option<String>,
    pub is_full_company_name: Option<bool>,
    pub skill_tag: Option<String>,
    pub welfare_tag: Option<String>,
}
