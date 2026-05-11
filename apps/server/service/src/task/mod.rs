use std::{collections::HashMap, str::FromStr};

use chrono::{DateTime, Utc};
use cron::Schedule;
use entity::task_data_plan::ActiveModel as TaskDataPlanActiveModel;
use entity::task_plan::ActiveModel as TaskPlanActiveModel;
use framework::id::gen_id;
use sea_orm::{ActiveValue, DbErr, EntityTrait, TransactionTrait};
use serde::{Deserialize, Serialize};
use strum_macros::{Display, EnumString};

use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[error("Database error: {0}")]
    Database(sea_orm::TransactionError<sea_orm::DbErr>),
    #[error("json error: {0}")]
    Json(serde_json::Error),
    #[error("invalid cron expr: {0}")]
    Cron(String),
}

impl From<sea_orm::TransactionError<sea_orm::DbErr>> for Error {
    fn from(err: sea_orm::TransactionError<sea_orm::DbErr>) -> Self {
        Error::Database(err)
    }
}

impl From<serde_json::Error> for Error {
    fn from(value: serde_json::Error) -> Self {
        Error::Json(value)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct TaskPlanConfigDataDownloadConfig {
    pub task_type_list: Vec<TaskType>,
    pub url: Option<String>,
    pub user_name: Option<String>,
    pub repo_name: Option<String>,
    pub key: Option<String>,
}

pub enum Type {
    DataDownload(TaskPlanConfigDataDownloadConfig),
}

#[derive(Display, EnumString)]
pub enum RepoType {
    #[strum(serialize = "GITHUB")]
    Github,
}

#[derive(Display, EnumString, Serialize, Deserialize, Clone, Debug)]
pub enum TaskType {
    #[strum(serialize = "JOB_DATA_DOWNLOAD")]
    JobDataDownload,
    #[strum(serialize = "COMPANY_DATA_DOWNLOAD")]
    CompanyDataDownload,
}

fn gen_url_by_repo_type(repo_type: &RepoType, user_name: &str, repo_name: &str) -> String {
    match repo_type {
        RepoType::Github => format!("https://github.com/{}/{}", user_name, repo_name),
    }
}

fn validate_cron(expr: &str) -> bool {
    Schedule::from_str(expr).is_ok()
}

pub async fn create_plan<C: TransactionTrait>(
    conn: &C,
    user_name: &str,
    repo_name: &str,
    repo_type: RepoType,
    task_type: Type,
    task_enable: bool,
    cron: &str,
    key: Option<String>,
) -> Result<(String, String), Error> {
    if !validate_cron(cron) {
        return Err(Error::Cron(cron.to_string()));
    }
    let (r#type, config) = {
        match &task_type {
            Type::DataDownload(task_plan_config_data_download_config) => (
                entity::task_plan::Type::DataDownload,
                match task_plan_config_data_download_config.url {
                    Some(_) => serde_json::to_string(task_plan_config_data_download_config)?,
                    None => match &repo_type {
                        RepoType::Github => {
                            serde_json::to_string(&TaskPlanConfigDataDownloadConfig {
                                task_type_list: task_plan_config_data_download_config
                                    .task_type_list
                                    .clone(),
                                url: Some(gen_url_by_repo_type(&repo_type, user_name, repo_name)),
                                user_name: Some(user_name.to_string()),
                                repo_name: Some(repo_name.to_string()),
                                key,
                            })?
                        }
                    },
                },
            ),
        }
    };
    let now = Utc::now();
    let user_name = user_name.to_string();
    let repo_name = repo_name.to_string();
    let cron = cron.to_string();
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
        .await?;
    Ok(result)
}

pub fn get_file_name_by_task_type(task_type: TaskType) -> String {
    match task_type {
        TaskType::JobDataDownload => "job".to_string(),
        TaskType::CompanyDataDownload => "company".to_string(),
    }
}

pub async fn query_repo_file_date_and_max_seq_map(
    file_name: &str,
    url: &str,
    key: Option<String>,
    now: DateTime<Utc>,
    retention_day: i32,
) -> Result<HashMap<String, i32>, anyhow::Error> {
    todo!();
}

pub fn filter_sort_fetch_date_info(
    repo_file_name_and_max_seq_map: HashMap<String, i32>,
) -> (DateTime<Utc>, DateTime<Utc>, Vec<DateTime<Utc>>) {
    todo!();
}

pub async fn query_date_list<C: TransactionTrait>(
    conn: &C,
    user_name: &str,
    repo_name: &str,
    task_type: TaskType,
    start_date: DateTime<Utc>,
    end_date: DateTime<Utc>,
) -> Result<Vec<DateTime<Utc>>, anyhow::Error> {
    todo!();
}
