use axum::{Json, Router, extract::State, http::StatusCode, response::IntoResponse, routing::post};
use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, QueryTrait};

use crate::{
    AppState,
    data::{
        bo::{job_search_bo::JobSearchBO, page_param_bo::PageParamBO},
        dto::page_result_dto::PageResultDTO,
    },
};
use entity::job::{self, Entity as Job};

pub async fn search(
    state: State<AppState>,
    Json(payload): Json<PageParamBO<JobSearchBO>>,
) -> impl IntoResponse {
    let selection = Job::find().apply_if(payload.param, |query, v| {
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
        .paginate(&state.conn, payload.page.page_size);
    let total = selection.clone().count(&state.conn).await.unwrap();
    let items = paginate.fetch_page(payload.page.page - 1).await.unwrap();
    let result = PageResultDTO { items, total };
    (StatusCode::OK, Json(result))
}

pub fn routes(state: AppState) -> Router {
    Router::new()
        .route("/job/search", post(search))
        .with_state(state)
}
