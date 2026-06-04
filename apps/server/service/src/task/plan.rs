use std::str::FromStr;

use anyhow::Context;
use chrono::{DateTime, Utc};
use cron::Schedule;
use entity::task_plan::ActiveModel as TaskPlanActiveModel;
use entity::task_plan::Column as TaskPlanColumn;
use entity::task_plan::Entity as TaskPlanEntity;
use entity::task_data_source_plan::Entity as TaskDataSourcePlanEntity;
use framework::id::gen_id;
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, ConnectionTrait, EntityTrait, IntoActiveModel,
    PaginatorTrait, QueryFilter, QueryOrder, QueryTrait,
};
use serde::{Deserialize, Serialize};

use crate::task::error::Error;

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct TaskPlanConfigDataDownloadConfig {
    pub task_type_list: Vec<super::download::TaskType>,
    pub url: Option<String>,
    pub user_name: Option<String>,
    pub repo_name: Option<String>,
    pub token: Option<String>,
}

pub enum Type {
    DataDownload(TaskPlanConfigDataDownloadConfig),
}

#[derive(strum_macros::Display, strum_macros::EnumString)]
pub enum RepoType {
    #[strum(serialize = "GITHUB")]
    Github,
}

pub struct CreatePlanParam {
    pub user_name: String,
    pub repo_name: String,
    pub repo_type: RepoType,
    pub task_type: Type,
    pub task_enable: bool,
    pub cron: String,
    pub token: Option<String>,
    pub now: DateTime<Utc>,
}

pub struct SearchPlanParam {
    pub page: framework::data::PageParam,
    pub r#type: Option<entity::task_plan::Type>,
    pub enable: Option<bool>,
    pub order_by: Option<String>,
    pub order_dir: Option<String>,
}

pub struct UpdatePlanParam {
    pub r#type: Option<entity::task_plan::Type>,
    pub enable: Option<bool>,
    pub cron: Option<String>,
    pub task_type_list: Option<Vec<super::download::TaskType>>,
    pub token: Option<String>,
    pub url: Option<String>,
}

pub async fn create_plan<C: ConnectionTrait>(
    conn: &C,
    param: CreatePlanParam,
) -> Result<String, Error> {
    let CreatePlanParam {
        user_name,
        repo_name,
        repo_type,
        task_type,
        task_enable,
        cron,
        token,
        now,
    } = param;
    if !validate_cron(&cron) {
        return Err(Error::Cron(cron.to_string()));
    }
    let (r#type, config) = {
        match &task_type {
            Type::DataDownload(task_plan_config_data_download_config) => (
                entity::task_plan::Type::DataDownload,
                match task_plan_config_data_download_config.url {
                    Some(_) => serde_json::to_string(task_plan_config_data_download_config)
                        .context("task plan config data download config to json string failure")?,
                    None => match &repo_type {
                        RepoType::Github => {
                            serde_json::to_string(&TaskPlanConfigDataDownloadConfig {
                                task_type_list: task_plan_config_data_download_config
                                    .task_type_list
                                    .clone(),
                                url: Some(gen_url_by_repo_type(&repo_type, &user_name, &repo_name)),
                                user_name: Some(user_name.to_string()),
                                repo_name: Some(repo_name.to_string()),
                                token,
                            })
                            .context(
                                "task plan config data download config to json string failure",
                            )?
                        }
                    },
                },
            ),
        }
    };
    let task_plan_id = gen_id();
    let task_plan = TaskPlanActiveModel {
        id: ActiveValue::Set(task_plan_id.clone()),
        r#type: ActiveValue::Set(Some(r#type)),
        enable: ActiveValue::Set(Some(task_enable)),
        config: ActiveValue::Set(Some(config)),
        cron: ActiveValue::Set(Some(cron)),
        create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
        update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
    };
    entity::task_plan::Entity::insert(task_plan)
        .exec(conn)
        .await?;
    Ok(task_plan_id)
}

pub async fn search_plans<C: ConnectionTrait>(
    conn: &C,
    param: SearchPlanParam,
) -> Result<(Vec<entity::task_plan::Model>, u64), sea_orm::DbErr> {
    let num = param.page.num;
    let size = param.page.size;
    let order_by = param.order_by.unwrap_or("update_datetime".to_string());
    let order_dir = param.order_dir.unwrap_or("desc".to_string());
    let is_asc = order_dir == "asc";

    let selection = TaskPlanEntity::find().apply_if(param.r#type, |query, v| {
        query.filter(TaskPlanColumn::Type.eq(v))
    }).apply_if(param.enable, |query, v| {
        query.filter(TaskPlanColumn::Enable.eq(v))
    });

    let paginate = match order_by.as_str() {
        "create_datetime" => {
            if is_asc {
                selection
                    .order_by_asc(TaskPlanColumn::CreateDatetime)
                    .order_by_asc(TaskPlanColumn::Id)
                    .paginate(conn, size)
            } else {
                selection
                    .order_by_desc(TaskPlanColumn::CreateDatetime)
                    .order_by_asc(TaskPlanColumn::Id)
                    .paginate(conn, size)
            }
        }
        _ => {
            if is_asc {
                selection
                    .order_by_asc(TaskPlanColumn::UpdateDatetime)
                    .order_by_asc(TaskPlanColumn::Id)
                    .paginate(conn, size)
            } else {
                selection
                    .order_by_desc(TaskPlanColumn::UpdateDatetime)
                    .order_by_asc(TaskPlanColumn::Id)
                    .paginate(conn, size)
            }
        }
    };
    let total = paginate.num_items().await?;
    let items = paginate.fetch_page(num - 1).await?;
    Ok((items, total))
}

pub async fn get_plan_by_id<C: ConnectionTrait>(
    conn: &C,
    id: &str,
) -> Result<entity::task_plan::Model, sea_orm::DbErr> {
    TaskPlanEntity::find_by_id(id)
        .one(conn)
        .await?
        .ok_or(sea_orm::DbErr::RecordNotFound("task_plan not found".to_string()))
}

pub async fn update_plan<C: ConnectionTrait>(
    conn: &C,
    id: &str,
    param: UpdatePlanParam,
) -> Result<entity::task_plan::Model, Error> {
    let plan = TaskPlanEntity::find_by_id(id)
        .one(conn)
        .await?
        .ok_or_else(|| Error::Internal(anyhow::anyhow!("task_plan not found")))?;

    let existing_config = plan.config.clone();

    let mut active_model = plan.into_active_model();
    if let Some(v) = param.r#type {
        active_model.r#type = ActiveValue::Set(Some(v));
    }
    if let Some(v) = param.enable {
        active_model.enable = ActiveValue::Set(Some(v));
    }
    if let Some(v) = param.cron {
        if !validate_cron(&v) {
            return Err(Error::Cron(v));
        }
        active_model.cron = ActiveValue::Set(Some(v));
    }

    if param.task_type_list.is_some() || param.token.is_some() || param.url.is_some() {
        let mut config: TaskPlanConfigDataDownloadConfig = existing_config
            .as_deref()
            .map(|c| serde_json::from_str(c))
            .transpose()
            .ok()
            .flatten()
            .unwrap_or_default();
        if let Some(v) = param.task_type_list {
            config.task_type_list = v;
        }
        if let Some(v) = param.token {
            config.token = Some(v);
        }
        if let Some(v) = param.url {
            config.url = Some(v);
        }
        active_model.config = ActiveValue::Set(Some(
            serde_json::to_string(&config)
                .context("serialize task plan config failure")?,
        ));
    }

    active_model.update_datetime = ActiveValue::Set(Some(chrono::Utc::now().fixed_offset()));

    active_model.update(conn).await?;
    TaskPlanEntity::find_by_id(id)
        .one(conn)
        .await?
        .ok_or_else(|| Error::Internal(anyhow::anyhow!("task_plan not found after update")))
}

pub async fn delete_plan<C: ConnectionTrait>(
    conn: &C,
    id: &str,
) -> Result<(), sea_orm::DbErr> {
    let id = id.to_string();
    TaskDataSourcePlanEntity::delete_many()
        .filter(entity::task_data_source_plan::Column::PlanId.eq(&id))
        .exec(conn)
        .await?;
    TaskPlanEntity::delete_by_id(&id).exec(conn).await?;
    Ok(())
}

pub(super) fn validate_cron(expr: &str) -> bool {
    Schedule::from_str(expr).is_ok()
}

pub(super) fn gen_url_by_repo_type(repo_type: &RepoType, user_name: &str, repo_name: &str) -> String {
    match repo_type {
        RepoType::Github => format!("https://github.com/{}/{}", user_name, repo_name),
    }
}
