use crate::AppState;
use axum::{debug_handler, extract::Query, extract::State};
use chrono::{Duration, Utc};
use entity::task::{Column as TaskColumn, Entity as Task};
use framework::{data::ApiResponse, error::ApiResult};
use sea_orm::sea_query::Expr;
use sea_orm::{ColumnTrait, EntityTrait, ExprTrait, QueryFilter, QueryOrder, QuerySelect};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use utoipa_axum::{
    router::{OpenApiRouter, UtoipaMethodRouterExt},
    routes,
};

const TAG: &str = "task_statistics";

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct StatItem {
    pub name: String,
    pub value: i64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct DailyBreakdownItem {
    pub date: String,
    pub status: String,
    pub value: i64,
}

#[derive(Debug, Deserialize)]
pub struct DaysQuery {
    days: Option<i32>,
}

pub fn create_routes(state: AppState) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(task_status_distribution).with_state(state.clone()))
        .routes(routes!(task_type_distribution).with_state(state.clone()))
        .routes(routes!(task_daily_count).with_state(state.clone()))
        .routes(routes!(task_daily_breakdown).with_state(state))
}

#[debug_handler]
#[utoipa::path(get, path = "/task/statistics/status", tag = TAG, security(()), responses(
    (status = OK, body = ApiResponse<Vec<StatItem>>)
))]
pub async fn task_status_distribution(
    State(AppState { conn, .. }): State<AppState>,
    Query(query): Query<DaysQuery>,
) -> ApiResult<ApiResponse<Vec<StatItem>>> {
    let mut task_query = Task::find()
        .select_only()
        .column_as(TaskColumn::Status, "status")
        .column_as(TaskColumn::Id.count(), "count")
        .group_by(TaskColumn::Status)
        .order_by_desc(TaskColumn::Id.count());

    if let Some(days) = query.days.filter(|d| *d > 0) {
        let since = (Utc::now() - Duration::days(days as i64)).fixed_offset();
        task_query = task_query.filter(TaskColumn::CreateDatetime.gte(since));
    }

    let results: Vec<(Option<String>, i64)> = task_query
        .into_tuple::<(Option<String>, i64)>()
        .all(&conn)
        .await?;

    let items: Vec<StatItem> = results
        .into_iter()
        .map(|(name, value)| StatItem {
            name: name.unwrap_or_else(|| "未知".to_string()),
            value,
        })
        .collect();

    Ok(ApiResponse::success(Some(items)))
}

#[debug_handler]
#[utoipa::path(get, path = "/task/statistics/type", tag = TAG, security(()), responses(
    (status = OK, body = ApiResponse<Vec<StatItem>>)
))]
pub async fn task_type_distribution(
    State(AppState { conn, .. }): State<AppState>,
) -> ApiResult<ApiResponse<Vec<StatItem>>> {
    let results: Vec<(Option<String>, i64)> = Task::find()
        .select_only()
        .column_as(TaskColumn::Type, "r#type")
        .column_as(TaskColumn::Id.count(), "count")
        .group_by(TaskColumn::Type)
        .order_by_desc(TaskColumn::Id.count())
        .into_tuple::<(Option<String>, i64)>()
        .all(&conn)
        .await?;

    let items: Vec<StatItem> = results
        .into_iter()
        .map(|(name, value)| StatItem {
            name: name.unwrap_or_else(|| "未知".to_string()),
            value,
        })
        .collect();

    Ok(ApiResponse::success(Some(items)))
}

#[debug_handler]
#[utoipa::path(get, path = "/task/statistics/daily-count", tag = TAG, security(()), responses(
    (status = OK, body = ApiResponse<Vec<StatItem>>)
))]
pub async fn task_daily_count(
    State(AppState { conn, .. }): State<AppState>,
    Query(query): Query<DaysQuery>,
) -> ApiResult<ApiResponse<Vec<StatItem>>> {
    let days = query.days.unwrap_or(30).clamp(1, 365);
    let since = (Utc::now() - Duration::days(days as i64)).fixed_offset();

    let results: Vec<(String, i64)> = Task::find()
        .select_only()
        .column_as(Expr::col(TaskColumn::CreateDatetime).cast_as("TEXT"), "day")
        .column_as(TaskColumn::Id.count(), "count")
        .filter(TaskColumn::CreateDatetime.gte(since))
        .filter(TaskColumn::CreateDatetime.is_not_null())
        .group_by(Expr::col(TaskColumn::CreateDatetime).cast_as("TEXT"))
        .order_by_asc(Expr::col(TaskColumn::CreateDatetime).cast_as("TEXT"))
        .into_tuple::<(String, i64)>()
        .all(&conn)
        .await?;

    let mut date_map: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
    for (name, value) in results {
        let date = if name.len() >= 10 {
            name[..10].to_string()
        } else {
            name
        };
        *date_map.entry(date).or_insert(0) += value;
    }

    let mut items: Vec<StatItem> = date_map
        .into_iter()
        .map(|(name, value)| StatItem { name, value })
        .collect();
    items.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(ApiResponse::success(Some(items)))
}

#[debug_handler]
#[utoipa::path(get, path = "/task/statistics/daily-breakdown", tag = TAG, security(()), responses(
    (status = OK, body = ApiResponse<Vec<DailyBreakdownItem>>)
))]
pub async fn task_daily_breakdown(
    State(AppState { conn, .. }): State<AppState>,
    Query(query): Query<DaysQuery>,
) -> ApiResult<ApiResponse<Vec<DailyBreakdownItem>>> {
    let days = query.days.unwrap_or(30).clamp(1, 365);
    let since = (Utc::now() - Duration::days(days as i64)).fixed_offset();

    let results: Vec<(String, Option<String>, i64)> = Task::find()
        .select_only()
        .column_as(Expr::col(TaskColumn::CreateDatetime).cast_as("TEXT"), "day")
        .column_as(TaskColumn::Status, "status")
        .column_as(TaskColumn::Id.count(), "count")
        .filter(TaskColumn::CreateDatetime.gte(since))
        .filter(TaskColumn::CreateDatetime.is_not_null())
        .group_by(Expr::col(TaskColumn::CreateDatetime).cast_as("TEXT"))
        .group_by(TaskColumn::Status)
        .order_by_asc(Expr::col(TaskColumn::CreateDatetime).cast_as("TEXT"))
        .into_tuple::<(String, Option<String>, i64)>()
        .all(&conn)
        .await?;

    let mut date_status_map: std::collections::BTreeMap<
        String,
        std::collections::HashMap<String, i64>,
    > = std::collections::BTreeMap::new();
    for (raw_date, status, value) in results {
        let date = if raw_date.len() >= 10 {
            raw_date[..10].to_string()
        } else {
            raw_date
        };
        let status_key = status.unwrap_or_else(|| "未知".to_string());
        *date_status_map
            .entry(date)
            .or_default()
            .entry(status_key)
            .or_insert(0) += value;
    }

    let mut items = Vec::new();
    for (date, status_map) in &date_status_map {
        for (status, value) in status_map {
            items.push(DailyBreakdownItem {
                date: date.clone(),
                status: status.clone(),
                value: *value,
            });
        }
    }

    Ok(ApiResponse::success(Some(items)))
}
