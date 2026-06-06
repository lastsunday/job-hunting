use anyhow::Context;
use chrono::{DateTime, Utc};
use entity::task_data_plan;
use entity::task_plan;
use framework::id::gen_id;
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, ConnectionTrait, EntityTrait, IntoActiveModel,
    QueryFilter, TransactionTrait,
};
use serde::{Deserialize, Serialize};

use super::download::TaskType;
use super::error::Error;
use super::plan::{
    delete_plan as delete_task_plan, get_plan_by_id, update_plan, CreatePlanParam, RepoType,
    TaskPlanConfigDataDownloadConfig, Type, UpdatePlanParam,
};

#[derive(Default, Deserialize, Serialize, Debug, Clone)]
pub struct UpdateDataPlanParam {
    pub r#type: Option<entity::task_plan::Type>,
    pub enable: Option<bool>,
    pub cron: Option<String>,
    pub user_name: Option<String>,
    pub repo_name: Option<String>,
    pub repo_type: Option<String>,
    pub token: Option<String>,
    pub url: Option<String>,
    pub task_type_list: Option<Vec<TaskType>>,
}

pub async fn create_data_plan<C: TransactionTrait>(
    conn: &C,
    param: CreatePlanParam,
) -> Result<(String, String), Error> {
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

    if !super::plan::validate_cron(&cron) {
        return Err(Error::Cron(cron.to_string()));
    }

    let result = conn
        .transaction::<_, _, Error>(|txn| {
            Box::pin(async move {
                let plan_id = create_task_plan_inner(
                    txn,
                    &user_name,
                    &repo_name,
                    &repo_type,
                    &task_type,
                    task_enable,
                    &cron,
                    token.clone(),
                    now,
                )
                .await?;

                let data_plan_id = gen_id();
                let data_plan = task_data_plan::ActiveModel {
                    id: ActiveValue::Set(data_plan_id.clone()),
                    plan_id: ActiveValue::Set(Some(plan_id.clone())),
                    user_name: ActiveValue::Set(Some(user_name)),
                    repo_name: ActiveValue::Set(Some(repo_name)),
                    repo_type: ActiveValue::Set(Some(repo_type.to_string())),
                    create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
                    update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
                };
                task_data_plan::Entity::insert(data_plan)
                    .exec(txn)
                    .await?;

                Ok((data_plan_id, plan_id))
            })
        })
        .await
        .map_err(|e| match e {
            sea_orm::TransactionError::Connection(db_err) => Error::Internal(db_err.into()),
            sea_orm::TransactionError::Transaction(err) => err,
        })?;
    Ok(result)
}

pub async fn delete_data_plan<C: ConnectionTrait>(
    conn: &C,
    data_plan_id: &str,
) -> Result<(), Error> {
    let data_plan = task_data_plan::Entity::find_by_id(data_plan_id)
        .one(conn)
        .await?
        .ok_or_else(|| Error::Internal(anyhow::anyhow!("task_data_plan not found")))?;

    let plan_id = data_plan
        .plan_id
        .ok_or_else(|| Error::Internal(anyhow::anyhow!("task_data_plan has no plan_id")))?;

    task_data_plan::Entity::delete_many()
        .filter(task_data_plan::Column::PlanId.eq(&plan_id))
        .exec(conn)
        .await?;
    delete_task_plan(conn, &plan_id).await?;
    Ok(())
}

pub async fn get_data_plan_by_id<C: ConnectionTrait>(
    conn: &C,
    id: &str,
) -> Result<(task_data_plan::Model, task_plan::Model), Error> {
    let dp = task_data_plan::Entity::find_by_id(id)
        .one(conn)
        .await?
        .ok_or_else(|| Error::Internal(anyhow::anyhow!("task_data_plan not found")))?;

    let plan_id = dp
        .plan_id
        .clone()
        .ok_or_else(|| Error::Internal(anyhow::anyhow!("task_data_plan has no plan_id")))?;
    let plan = get_plan_by_id(conn, &plan_id)
        .await
        .map_err(|e| Error::Internal(anyhow::anyhow!("task_plan not found: {e}")))?;

    Ok((dp, plan))
}

pub async fn update_data_plan<C: ConnectionTrait>(
    conn: &C,
    id: &str,
    param: UpdateDataPlanParam,
) -> Result<(task_data_plan::Model, task_plan::Model), Error> {
    let data_plan = task_data_plan::Entity::find_by_id(id)
        .one(conn)
        .await?
        .ok_or_else(|| Error::Internal(anyhow::anyhow!("task_data_plan not found")))?;

    let plan_id = data_plan
        .plan_id
        .clone()
        .ok_or_else(|| Error::Internal(anyhow::anyhow!("task_data_plan has no plan_id")))?;

    let mut dp_active = data_plan.into_active_model();
    if let Some(v) = param.user_name {
        dp_active.user_name = ActiveValue::Set(Some(v));
    }
    if let Some(v) = param.repo_name {
        dp_active.repo_name = ActiveValue::Set(Some(v));
    }
    if let Some(v) = param.repo_type {
        dp_active.repo_type = ActiveValue::Set(Some(v));
    }
    dp_active.update_datetime = ActiveValue::Set(Some(chrono::Utc::now().fixed_offset()));
    dp_active.update(conn).await?;

    let service_param = UpdatePlanParam {
        r#type: param.r#type,
        enable: param.enable,
        cron: param.cron,
        task_type_list: param.task_type_list,
        token: param.token,
        url: param.url,
    };
    let plan = update_plan(conn, &plan_id, service_param).await?;

    let dp = task_data_plan::Entity::find_by_id(id)
        .one(conn)
        .await?
        .ok_or_else(|| Error::Internal(anyhow::anyhow!("task_data_plan not found after update")))?;

    Ok((dp, plan))
}

#[allow(clippy::too_many_arguments)]
async fn create_task_plan_inner<C: ConnectionTrait>(
    conn: &C,
    user_name: &str,
    repo_name: &str,
    repo_type: &RepoType,
    task_type: &Type,
    task_enable: bool,
    cron: &str,
    token: Option<String>,
    now: DateTime<Utc>,
) -> Result<String, Error> {
    let (r#type, config) = match task_type {
        Type::DataDownload(task_plan_config_data_download_config) => (
            entity::task_plan::Type::DataDownload,
            match &task_plan_config_data_download_config.url {
                Some(_) => serde_json::to_string(task_plan_config_data_download_config)
                    .context("task plan config data download config to json string failure")?,
                None => serde_json::to_string(&TaskPlanConfigDataDownloadConfig {
                    task_type_list: task_plan_config_data_download_config.task_type_list.clone(),
                    url: Some(super::plan::gen_url_by_repo_type(repo_type, user_name, repo_name)),
                    user_name: Some(user_name.to_string()),
                    repo_name: Some(repo_name.to_string()),
                    token,
                })
                .context("task plan config data download config to json string failure")?,
            },
        ),
    };

    let task_plan_id = gen_id();
    let task_plan = task_plan::ActiveModel {
        id: ActiveValue::Set(task_plan_id.clone()),
        r#type: ActiveValue::Set(Some(r#type)),
        enable: ActiveValue::Set(Some(task_enable)),
        config: ActiveValue::Set(Some(config)),
        cron: ActiveValue::Set(Some(cron.to_string())),
        create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
        update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
    };
    task_plan::Entity::insert(task_plan).exec(conn).await?;
    Ok(task_plan_id)
}
