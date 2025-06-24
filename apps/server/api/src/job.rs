use crate::{
    AppState,
    common::{
        data::{ApiPageResult, ApiResponse, valid::ValidJson},
        error::ApiResult,
    },
};
use axum::{debug_handler, extract::State};
use entity::job::{self, Entity as Job};
use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, QueryTrait};
use utoipa::ToSchema;
use utoipa_axum::{
    router::{OpenApiRouter, UtoipaMethodRouterExt},
    routes,
};

const TAG: &str = "job";

pub fn create_routes(state: AppState) -> OpenApiRouter {
    OpenApiRouter::new().routes(routes!(search).with_state(state))
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

use crate::common::data::PageParam;
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
