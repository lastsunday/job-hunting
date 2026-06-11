use framework::{error::critical_code::CriticalErrorCode, prelude::*};

#[error]
pub enum TaskPlanErrorCode {
    CronInvalid = 508001,
    PlanIdEmpty = 508003,
}

use crate::AppState;
use axum::{debug_handler, extract::Extension, extract::Path, extract::State};
use chrono::{DateTime, FixedOffset};
use entity::schema::date_time_with_time_zone_or_null_schema;
use entity::task_data_plan;
use entity::task_plan;
use entity::task_plan::Type as PlanType;
use framework::{
    auth::Principal,
    data::{ApiPageResult, ApiResponse, PageParam, valid::ValidJson},
    error::ApiResult,
    middleware::get_auth_layer,
};
use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder};
use serde::{Deserialize, Serialize};
use service::task::data_plan::{
    UpdateDataPlanParam, create_data_plan, delete_data_plan, get_data_plan_by_id, update_data_plan,
};
use service::task::download::TaskType;
use service::task::plan::{CreatePlanParam, RepoType, TaskPlanConfigDataDownloadConfig, Type};
use std::collections::HashMap;
use utoipa::ToSchema;
use utoipa_axum::{
    router::{OpenApiRouter, UtoipaMethodRouterExt},
    routes,
};
use validator::Validate;

const TAG: &str = "task_data_plan";

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct TaskDataPlanDetail {
    pub id: String,
    pub plan_id: Option<String>,
    pub user_name: Option<String>,
    pub repo_name: Option<String>,
    pub repo_type: Option<String>,
    pub r#type: Option<PlanType>,
    pub enable: Option<bool>,
    pub config: Option<serde_json::Value>,
    pub cron: Option<String>,
    #[schema(schema_with = date_time_with_time_zone_or_null_schema)]
    pub create_datetime: Option<DateTime<FixedOffset>>,
    #[schema(schema_with = date_time_with_time_zone_or_null_schema)]
    pub update_datetime: Option<DateTime<FixedOffset>>,
}

pub fn create_routes(state: AppState) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(search).with_state(state.clone()))
        .routes(routes!(create).with_state(state.clone()))
        .routes(routes!(get_by_id).with_state(state.clone()))
        .routes(routes!(update).with_state(state.clone()))
        .route(
            "/task_data_plan/{id}",
            axum::routing::delete(delete).with_state(state),
        )
        .route_layer(get_auth_layer())
}

#[derive(Default, Deserialize, Serialize, Debug, Clone, Validate, ToSchema)]
pub struct SearchParam {
    #[validate(nested)]
    pub page: PageParam,
    pub user_name: Option<String>,
    pub repo_name: Option<String>,
    pub repo_type: Option<String>,
    pub r#type: Option<PlanType>,
    pub enable: Option<bool>,
}

#[debug_handler]
#[utoipa::path(post, path = "/task_data_plan/search", tag = TAG, security(()), request_body = SearchParam, responses(
    (status = OK, body = ApiResponse<ApiPageResult<TaskDataPlanDetail>>)
))]
pub async fn search(
    State(AppState { conn, .. }): State<AppState>,
    ValidJson(param): ValidJson<SearchParam>,
) -> ApiResult<ApiResponse<ApiPageResult<TaskDataPlanDetail>>> {
    let type_filter = param.r#type.clone();
    let matching_plan_ids = if type_filter.is_some() || param.enable.is_some() {
        let mut plan_query = task_plan::Entity::find();
        if let Some(v) = type_filter {
            plan_query = plan_query.filter(task_plan::Column::Type.eq(v));
        }
        if let Some(v) = param.enable {
            plan_query = plan_query.filter(task_plan::Column::Enable.eq(v));
        }
        plan_query
            .all(&conn)
            .await?
            .into_iter()
            .map(|p| p.id)
            .collect::<Vec<_>>()
    } else {
        vec![]
    };

    if (param.r#type.is_some() || param.enable.is_some()) && matching_plan_ids.is_empty() {
        return Ok(ApiResponse::success(Some(ApiPageResult::new(vec![], 0))));
    }

    let mut data_query = task_data_plan::Entity::find();
    if let Some(v) = param.user_name {
        data_query = data_query.filter(task_data_plan::Column::UserName.contains(v));
    }
    if let Some(v) = param.repo_name {
        data_query = data_query.filter(task_data_plan::Column::RepoName.contains(v));
    }
    if let Some(v) = param.repo_type {
        data_query = data_query.filter(task_data_plan::Column::RepoType.eq(v));
    }
    if !matching_plan_ids.is_empty() {
        data_query = data_query.filter(task_data_plan::Column::PlanId.is_in(matching_plan_ids));
    }

    let paginator = data_query
        .order_by_desc(task_data_plan::Column::UpdateDatetime)
        .paginate(&conn, param.page.size);

    let total = paginator.num_items().await?;
    let data_plans = paginator.fetch_page(param.page.num - 1).await?;

    let pids: Vec<&str> = data_plans
        .iter()
        .filter_map(|dp| dp.plan_id.as_deref())
        .collect();

    let plans = if pids.is_empty() {
        vec![]
    } else {
        task_plan::Entity::find()
            .filter(task_plan::Column::Id.is_in(pids))
            .all(&conn)
            .await?
    };

    let plan_map: HashMap<&str, &task_plan::Model> =
        plans.iter().map(|p| (p.id.as_str(), p)).collect();

    let items: Vec<TaskDataPlanDetail> = data_plans
        .into_iter()
        .map(|dp| {
            let plan = dp
                .plan_id
                .as_deref()
                .and_then(|id| plan_map.get(id).copied());
            TaskDataPlanDetail {
                id: dp.id,
                plan_id: dp.plan_id,
                user_name: dp.user_name,
                repo_name: dp.repo_name,
                repo_type: dp.repo_type,
                r#type: plan.and_then(|p| p.r#type.clone()),
                enable: plan.and_then(|p| p.enable),
                config: plan.and_then(|p| p.config.clone()),
                cron: plan.and_then(|p| p.cron.clone()),
                create_datetime: dp.create_datetime,
                update_datetime: dp.update_datetime,
            }
        })
        .collect();

    Ok(ApiResponse::success(Some(ApiPageResult::new(items, total))))
}

#[derive(Default, Deserialize, Serialize, Debug, Clone, Validate, ToSchema)]
pub struct CreateTaskPlanRequest {
    pub r#type: Option<PlanType>,
    pub enable: Option<bool>,
    pub cron: Option<String>,
    pub user_name: Option<String>,
    pub repo_name: Option<String>,
    pub repo_type: Option<String>,
    pub token: Option<String>,
    pub url: Option<String>,
    pub task_type_list: Option<Vec<String>>,
}

#[debug_handler]
#[utoipa::path(post, path = "/task_data_plan", tag = TAG, security(()), request_body = CreateTaskPlanRequest, responses(
    (status = OK, body = ApiResponse<TaskDataPlanDetail>)
))]
pub async fn create(
    State(AppState { conn, .. }): State<AppState>,
    Extension(_principal): Extension<Principal>,
    ValidJson(param): ValidJson<CreateTaskPlanRequest>,
) -> ApiResult<ApiResponse<TaskDataPlanDetail>> {
    let repo_type = match param.repo_type.as_deref() {
        Some("GITHUB") => RepoType::Github,
        _ => RepoType::Github,
    };

    let task_type_list: Vec<TaskType> = param
        .task_type_list
        .unwrap_or_default()
        .into_iter()
        .filter_map(|s| s.parse::<TaskType>().ok())
        .collect();

    let task_type = Type::DataDownload(TaskPlanConfigDataDownloadConfig {
        task_type_list,
        url: param.url.clone(),
        user_name: param.user_name.clone(),
        repo_name: param.repo_name.clone(),
        token: param.token.clone(),
    });

    let cron = param.cron.ok_or(err!(TaskPlanErrorCode::CronInvalid))?;
    let user_name = param
        .user_name
        .ok_or(err!(TaskPlanErrorCode::PlanIdEmpty))?;
    let repo_name = param
        .repo_name
        .ok_or(err!(TaskPlanErrorCode::PlanIdEmpty))?;

    let (data_plan_id, _plan_id) = create_data_plan(
        &conn,
        CreatePlanParam {
            user_name,
            repo_name,
            repo_type,
            task_type,
            task_enable: param.enable.unwrap_or(true),
            cron,
            token: param.token,
            now: chrono::Utc::now(),
        },
    )
    .await
    .map_err(|e| err!(TaskPlanErrorCode::CronInvalid).with_extra(e.to_string()))?;

    let (dp, plan) = get_data_plan_by_id(&conn, &data_plan_id)
        .await
        .map_err(|_| err!(CriticalErrorCode::ResourceNotFound))?;

    Ok(ApiResponse::success(Some(TaskDataPlanDetail {
        id: dp.id,
        plan_id: dp.plan_id,
        user_name: dp.user_name,
        repo_name: dp.repo_name,
        repo_type: dp.repo_type,
        r#type: plan.r#type,
        enable: plan.enable,
        config: plan.config,
        cron: plan.cron,
        create_datetime: dp.create_datetime,
        update_datetime: dp.update_datetime,
    })))
}

#[debug_handler]
#[utoipa::path(get, path = "/task_data_plan/{id}", tag = TAG, security(()), responses(
    (status = OK, body = ApiResponse<TaskDataPlanDetail>)
))]
pub async fn get_by_id(
    State(AppState { conn, .. }): State<AppState>,
    Path(id): Path<String>,
) -> ApiResult<ApiResponse<TaskDataPlanDetail>> {
    let (dp, plan) = get_data_plan_by_id(&conn, &id)
        .await
        .map_err(|_| err!(CriticalErrorCode::ResourceNotFound))?;

    Ok(ApiResponse::success(Some(TaskDataPlanDetail {
        id: dp.id,
        plan_id: dp.plan_id,
        user_name: dp.user_name,
        repo_name: dp.repo_name,
        repo_type: dp.repo_type,
        r#type: plan.r#type,
        enable: plan.enable,
        config: plan.config,
        cron: plan.cron,
        create_datetime: dp.create_datetime,
        update_datetime: dp.update_datetime,
    })))
}

#[derive(Default, Deserialize, Serialize, Debug, Clone, Validate, ToSchema)]
pub struct UpdateTaskPlanRequest {
    pub r#type: Option<PlanType>,
    pub enable: Option<bool>,
    pub cron: Option<String>,
    pub user_name: Option<String>,
    pub repo_name: Option<String>,
    pub repo_type: Option<String>,
    pub token: Option<String>,
    pub url: Option<String>,
    pub task_type_list: Option<Vec<String>>,
}

#[debug_handler]
#[utoipa::path(put, path = "/task_data_plan/{id}", tag = TAG, security(()), request_body = UpdateTaskPlanRequest, responses(
    (status = OK, body = ApiResponse<TaskDataPlanDetail>)
))]
pub async fn update(
    State(AppState { conn, .. }): State<AppState>,
    Path(id): Path<String>,
    ValidJson(param): ValidJson<UpdateTaskPlanRequest>,
) -> ApiResult<ApiResponse<TaskDataPlanDetail>> {
    let task_type_list: Option<Vec<TaskType>> = param
        .task_type_list
        .map(|list| {
            list.into_iter()
                .filter_map(|s| s.parse::<TaskType>().ok())
                .collect()
        })
        .filter(|v: &Vec<TaskType>| !v.is_empty());

    let (dp, plan) = update_data_plan(
        &conn,
        &id,
        UpdateDataPlanParam {
            r#type: param.r#type,
            enable: param.enable,
            cron: param.cron,
            user_name: param.user_name,
            repo_name: param.repo_name,
            repo_type: param.repo_type,
            token: param.token,
            url: param.url,
            task_type_list,
        },
    )
    .await
    .map_err(|e| err!(TaskPlanErrorCode::CronInvalid).with_extra(e.to_string()))?;

    Ok(ApiResponse::success(Some(TaskDataPlanDetail {
        id: dp.id,
        plan_id: dp.plan_id,
        user_name: dp.user_name,
        repo_name: dp.repo_name,
        repo_type: dp.repo_type,
        r#type: plan.r#type,
        enable: plan.enable,
        config: plan.config,
        cron: plan.cron,
        create_datetime: dp.create_datetime,
        update_datetime: dp.update_datetime,
    })))
}

#[debug_handler]
#[utoipa::path(delete, path = "/task_data_plan/{id}", tag = TAG, security(()), responses(
    (status = OK, body = ApiResponse<String>)
))]
pub async fn delete(
    State(AppState { conn, .. }): State<AppState>,
    Path(id): Path<String>,
) -> ApiResult<ApiResponse<String>> {
    delete_data_plan(&conn, &id)
        .await
        .map_err(|_| err!(CriticalErrorCode::ResourceNotFound))?;
    Ok(ApiResponse::success(Some("Deleted".to_string())))
}
