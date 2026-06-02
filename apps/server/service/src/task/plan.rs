use std::str::FromStr;

use anyhow::Context;
use chrono::{DateTime, Utc};
use cron::Schedule;
use entity::task_data_plan::ActiveModel as TaskDataPlanActiveModel;
use entity::task_plan::ActiveModel as TaskPlanActiveModel;
use framework::id::gen_id;
use sea_orm::{ActiveValue, DbErr, EntityTrait, TransactionTrait};
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

pub async fn create_plan<C: TransactionTrait>(
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
    let result = conn
        .transaction::<_, _, DbErr>(|txn| {
            Box::pin(async move {
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

                let task_data_plan_id = gen_id();
                let task_data_plan = TaskDataPlanActiveModel {
                    id: ActiveValue::Set(task_data_plan_id.clone()),
                    plan_id: ActiveValue::Set(Some(task_plan_id.clone())),
                    username: ActiveValue::Set(Some(user_name.to_string())),
                    repo_name: ActiveValue::Set(Some(repo_name.to_string())),
                    repo_type: ActiveValue::Set(Some(repo_type.to_string())),
                    create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
                    update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
                };
                entity::task_plan::Entity::insert(task_plan)
                    .exec(txn)
                    .await?;
                entity::task_data_plan::Entity::insert(task_data_plan)
                    .exec(txn)
                    .await?;

                Ok((task_data_plan_id, task_plan_id))
            })
        })
        .await
        .map_err(|e| match e {
            sea_orm::TransactionError::Connection(db_err) => db_err,
            sea_orm::TransactionError::Transaction(db_err) => db_err,
        })?;
    Ok(result)
}

fn validate_cron(expr: &str) -> bool {
    Schedule::from_str(expr).is_ok()
}

fn gen_url_by_repo_type(repo_type: &RepoType, user_name: &str, repo_name: &str) -> String {
    match repo_type {
        RepoType::Github => format!("https://github.com/{}/{}", user_name, repo_name),
    }
}
