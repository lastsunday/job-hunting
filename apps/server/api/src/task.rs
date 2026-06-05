use framework::prelude::*;

#[error]
pub enum TaskRunErrorCode {
    SearchFailed = 509001,
}

use crate::AppState;
use axum::{debug_handler, extract::State};
use chrono::{DateTime, FixedOffset};
use entity::schema::date_time_with_time_zone_or_null_schema;
use entity::task::{self, Entity as Task, Status, Type};
use entity::task_data_download::Entity as TaskDataDownload;
use entity::task_data_merge::Entity as TaskDataMerge;
use framework::{
    data::{ApiPageResult, ApiResponse, PageParam, valid::ValidJson},
    error::ApiResult,
    middleware::get_auth_layer,
};
use sea_orm::{
    ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use utoipa::ToSchema;
use utoipa_axum::{
    router::{OpenApiRouter, UtoipaMethodRouterExt},
    routes,
};
use validator::Validate;

const TAG: &str = "task";

#[derive(Default, Deserialize, Serialize, Debug, Clone, Validate, ToSchema)]
pub struct SearchTaskParam {
    #[validate(nested)]
    pub page: PageParam,
    pub type_list: Option<Vec<Type>>,
    pub status_list: Option<Vec<Status>>,
    pub plan_id: Option<String>,
    #[schema(schema_with = date_time_with_time_zone_or_null_schema)]
    pub start_datetime_for_create: Option<DateTime<FixedOffset>>,
    #[schema(schema_with = date_time_with_time_zone_or_null_schema)]
    pub end_datetime_for_create: Option<DateTime<FixedOffset>>,
    #[schema(schema_with = date_time_with_time_zone_or_null_schema)]
    pub start_datetime_for_update: Option<DateTime<FixedOffset>>,
    #[schema(schema_with = date_time_with_time_zone_or_null_schema)]
    pub end_datetime_for_update: Option<DateTime<FixedOffset>>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct TaskRunDetail {
    pub id: String,
    pub plan_id: Option<String>,
    pub r#type: Option<Type>,
    pub data_id: Option<String>,
    pub status: Option<Status>,
    pub error_reason: Option<String>,
    pub cost_time: Option<i32>,
    pub retry_count: Option<i32>,
    #[schema(schema_with = date_time_with_time_zone_or_null_schema)]
    pub create_datetime: Option<DateTime<FixedOffset>>,
    #[schema(schema_with = date_time_with_time_zone_or_null_schema)]
    pub update_datetime: Option<DateTime<FixedOffset>>,
    pub detail_user_name: Option<String>,
    pub detail_repo_name: Option<String>,
    #[schema(schema_with = date_time_with_time_zone_or_null_schema)]
    pub detail_datetime: Option<DateTime<FixedOffset>>,
    pub detail_seq: Option<i32>,
    pub detail_data_count: Option<i32>,
    pub detail_data_page_num: Option<i32>,
    pub detail_data_page_size: Option<i32>,
}

pub fn create_routes(state: AppState) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(search).with_state(state))
        .route_layer(get_auth_layer())
}

#[debug_handler]
#[utoipa::path(post, path = "/task/search", tag = TAG, security(()), request_body = SearchTaskParam, responses(
    (status = OK, body = ApiResponse<ApiPageResult<TaskRunDetail>>)
))]
pub async fn search(
    State(AppState { conn, .. }): State<AppState>,
    ValidJson(param): ValidJson<SearchTaskParam>,
) -> ApiResult<ApiResponse<ApiPageResult<TaskRunDetail>>> {
    let mut task_query = Task::find();

    if let Some(type_list) = &param.type_list {
        task_query = task_query.filter(task::Column::Type.is_in(type_list.clone()));
    }
    if let Some(status_list) = &param.status_list {
        task_query = task_query.filter(task::Column::Status.is_in(status_list.clone()));
    }
    if let Some(plan_id) = &param.plan_id {
        task_query = task_query.filter(task::Column::PlanId.eq(plan_id));
    }
    if let Some(dt) = param.start_datetime_for_create {
        task_query = task_query.filter(task::Column::CreateDatetime.gte(dt));
    }
    if let Some(dt) = param.end_datetime_for_create {
        task_query = task_query.filter(task::Column::CreateDatetime.lte(dt));
    }
    if let Some(dt) = param.start_datetime_for_update {
        task_query = task_query.filter(task::Column::UpdateDatetime.gte(dt));
    }
    if let Some(dt) = param.end_datetime_for_update {
        task_query = task_query.filter(task::Column::UpdateDatetime.lte(dt));
    }

    let paginator = task_query
        .order_by_desc(task::Column::UpdateDatetime)
        .paginate(&conn, param.page.size);

    let total = paginator.num_items().await.map_err(|_| err!(TaskRunErrorCode::SearchFailed))?;
    let tasks = paginator.fetch_page(param.page.num - 1).await.map_err(|_| err!(TaskRunErrorCode::SearchFailed))?;

    let mut download_map: HashMap<String, entity::task_data_download::Model> = HashMap::new();
    let mut merge_map: HashMap<String, entity::task_data_merge::Model> = HashMap::new();

    let download_ids: Vec<&str> = tasks
        .iter()
        .filter(|t| {
            t.r#type.as_ref().is_some_and(|ty| ty.is_download())
                && t.data_id.is_some()
        })
        .filter_map(|t| t.data_id.as_deref())
        .collect();

    let merge_ids: Vec<&str> = tasks
        .iter()
        .filter(|t| {
            t.r#type.as_ref().is_some_and(|ty| ty.is_merge())
                && t.data_id.is_some()
        })
        .filter_map(|t| t.data_id.as_deref())
        .collect();

    if !download_ids.is_empty() {
        let items = TaskDataDownload::find()
            .filter(entity::task_data_download::Column::Id.is_in(download_ids))
            .all(&conn)
            .await
            .map_err(|_| err!(TaskRunErrorCode::SearchFailed))?;
        for item in items {
            download_map.insert(item.id.clone(), item);
        }
    }

    if !merge_ids.is_empty() {
        let items = TaskDataMerge::find()
            .filter(entity::task_data_merge::Column::Id.is_in(merge_ids))
            .all(&conn)
            .await
            .map_err(|_| err!(TaskRunErrorCode::SearchFailed))?;
        for item in items {
            merge_map.insert(item.id.clone(), item);
        }
    }

    let items: Vec<TaskRunDetail> = tasks
        .into_iter()
        .map(|t| {
            let is_download = t.r#type.as_ref().is_some_and(|ty| ty.is_download());
            let is_merge = t.r#type.as_ref().is_some_and(|ty| ty.is_merge());

            let (detail_user_name, detail_repo_name, detail_datetime, detail_seq, detail_data_count, detail_data_page_num, detail_data_page_size) =
                if is_download {
                    if let Some(data_id) = &t.data_id {
                        if let Some(d) = download_map.get(data_id) {
                            (
                                d.user_name.clone(),
                                d.repo_name.clone(),
                                d.datetime,
                                d.seq,
                                None,
                                None,
                                None,
                            )
                        } else {
                            (None, None, None, None, None, None, None)
                        }
                    } else {
                        (None, None, None, None, None, None, None)
                    }
                } else if is_merge {
                    if let Some(data_id) = &t.data_id {
                        if let Some(d) = merge_map.get(data_id) {
                            (
                                d.user_name.clone(),
                                d.repo_name.clone(),
                                d.datetime,
                                None,
                                d.data_count,
                                d.data_page_num,
                                d.data_page_size,
                            )
                        } else {
                            (None, None, None, None, None, None, None)
                        }
                    } else {
                        (None, None, None, None, None, None, None)
                    }
                } else {
                    (None, None, None, None, None, None, None)
                };

            TaskRunDetail {
                id: t.id,
                plan_id: t.plan_id,
                r#type: t.r#type,
                data_id: t.data_id,
                status: t.status,
                error_reason: t.error_reason,
                cost_time: t.cost_time,
                retry_count: t.retry_count,
                create_datetime: t.create_datetime,
                update_datetime: t.update_datetime,
                detail_user_name,
                detail_repo_name,
                detail_datetime,
                detail_seq,
                detail_data_count,
                detail_data_page_num,
                detail_data_page_size,
            }
        })
        .collect();

    Ok(ApiResponse::success(Some(ApiPageResult::new(items, total))))
}
