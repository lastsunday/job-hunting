use std::{collections::HashMap, str::FromStr};

use chrono::{DateTime, FixedOffset, Local, Utc};
use cron::Schedule;
use entity::task::ActiveModel as TaskActiveModel;
use entity::task_data_download::ActiveModel as TaskDataDownloadActiveModel;
use entity::task_data_plan::ActiveModel as TaskDataPlanActiveModel;
use entity::task_plan::ActiveModel as TaskPlanActiveModel;
use framework::id::gen_id;
use sea_orm::{
    ActiveValue, ColumnTrait, ConnectionTrait, DbErr, EntityTrait, QueryFilter, TransactionTrait,
};
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

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct TaskDataDownloadConfig {
    pub url: Option<String>,
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

// TODO: need delete
pub async fn query_repo_file_date_and_max_seq_map(
    file_name: &str,
    url: &str,
    key: &Option<String>,
    now: &DateTime<Utc>,
    retention_day: i32,
) -> Result<HashMap<DateTime<Utc>, i32>, anyhow::Error> {
    let mut result = HashMap::new();
    result.insert("2024-01-02T00:00:00Z".parse::<DateTime<Utc>>()?, 1);
    result.insert("2024-01-01T00:00:00Z".parse::<DateTime<Utc>>()?, 1);
    Ok(result)
}

pub type DateForStartEndAndList = (DateTime<Utc>, DateTime<Utc>, Vec<DateTime<Utc>>);

pub fn filter_sort_fetch_date_info(
    repo_file_date_and_max_seq_map: &HashMap<DateTime<Utc>, i32>,
) -> Result<DateForStartEndAndList, anyhow::Error> {
    let mut date_list = repo_file_date_and_max_seq_map
        .keys()
        .cloned()
        .collect::<Vec<DateTime<Utc>>>();
    date_list.sort();
    let start = *date_list
        .first()
        .ok_or(anyhow::Error::msg("repo file date start is empty"))?;
    let end = *date_list
        .last()
        .ok_or(anyhow::Error::msg("repo file date end is empty"))?;
    Ok((start, end, date_list))
}

pub async fn query_date_list<C: ConnectionTrait>(
    conn: &C,
    user_name: &str,
    repo_name: &str,
    task_type: &TaskType,
    start_date: &DateTime<Utc>,
    end_date: &DateTime<Utc>,
) -> Result<Vec<DateTime<Utc>>, anyhow::Error> {
    let task_type_param = match task_type {
        TaskType::JobDataDownload => entity::task_data_download::Type::JobDataDownload,
        TaskType::CompanyDataDownload => entity::task_data_download::Type::CompanyDataDownload,
    };
    let items = entity::task_data_download::Entity::find()
        .filter(entity::task_data_download::Column::Username.eq(Some(user_name.to_string())))
        .filter(entity::task_data_download::Column::RepoName.eq(Some(repo_name.to_string())))
        .filter(entity::task_data_download::Column::Type.eq(Some(task_type_param)))
        // TODO: 需要注意日期边界范围测试
        .filter(entity::task_data_download::Column::Datetime.gte(start_date.fixed_offset()))
        .filter(entity::task_data_download::Column::Datetime.lte(end_date.fixed_offset()))
        .all(conn)
        .await?;
    let result: Vec<Option<DateTime<FixedOffset>>> =
        items.iter().map(|item| item.datetime).collect::<_>();
    let result: Vec<DateTime<FixedOffset>> = result.iter().flatten().cloned().collect::<_>();
    let result: Vec<DateTime<Utc>> = result.iter().map(|item| item.to_utc()).collect::<_>();
    Ok(result)
}

pub type DateAndMaxSeq = (DateTime<Utc>, i32);

pub fn calculate_lack_date_max_seq_list(
    repo_asc_date_list: &[DateTime<Utc>],
    db_date_list: &[DateTime<Utc>],
    repo_file_date_and_max_seq_map: &HashMap<DateTime<Utc>, i32>,
) -> Result<Vec<DateAndMaxSeq>, anyhow::Error> {
    let mut result = vec![];
    let filter_date_asc_list = repo_asc_date_list
        .iter()
        .filter(|item| !db_date_list.contains(item))
        .collect::<Vec<_>>();
    for date in filter_date_asc_list {
        result.push((
            *date,
            *repo_file_date_and_max_seq_map
                .get(date)
                .ok_or(anyhow::Error::msg("not found file date max seq"))?,
        ));
    }
    Ok(result)
}

pub type TaskAndDataId = (String, String);

pub async fn save_data_download_task<C: TransactionTrait>(
    conn: &C,
    plan_id: &str,
    task_type: &TaskType,
    lack_date_max_seq_list: &[DateAndMaxSeq],
    url: &str,
    user_name: &str,
    repo_name: &str,
) -> Result<Vec<TaskAndDataId>, anyhow::Error> {
    let plan_id = plan_id.to_string();
    let lack_date_max_seq_list = lack_date_max_seq_list.to_vec();
    let user_name = user_name.to_string();
    let repo_name = repo_name.to_string();
    let (task_model_type, task_download_model_type) = match task_type {
        TaskType::JobDataDownload => (
            entity::task::Type::JobDataDownload,
            entity::task_data_download::Type::JobDataDownload,
        ),
        TaskType::CompanyDataDownload => (
            entity::task::Type::CompanyDataDownload,
            entity::task_data_download::Type::CompanyDataDownload,
        ),
    };
    let config = serde_json::to_string(&TaskDataDownloadConfig {
        url: Some(url.to_string()),
    })?;
    let result = conn
        .transaction::<_, _, DbErr>(|txn| {
            Box::pin(async move {
                let mut result = vec![];
                let now = Local::now().to_utc();
                for (date, max_seq) in lack_date_max_seq_list {
                    for seq in 0..max_seq {
                        let task_id = gen_id();
                        let task_data_id = gen_id();
                        let task = TaskActiveModel {
                            id: ActiveValue::Set(task_id.clone()),
                            plan_id: ActiveValue::Set(Some(plan_id.clone())),
                            r#type: ActiveValue::Set(Some(task_model_type.clone())),
                            data_id: ActiveValue::Set(Some(task_data_id.clone())),
                            status: ActiveValue::Set(Some(entity::task::Status::Ready)),
                            error_reason: ActiveValue::Set(None),
                            cost_time: ActiveValue::Set(Some(0)),
                            retry_count: ActiveValue::Set(Some(0)),
                            create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
                            update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
                        };
                        let task_data_download = TaskDataDownloadActiveModel {
                            id: ActiveValue::Set(task_data_id.clone()),
                            r#type: ActiveValue::Set(Some(task_download_model_type.clone())),
                            username: ActiveValue::Set(Some(user_name.clone())),
                            repo_name: ActiveValue::Set(Some(repo_name.clone())),
                            datetime: ActiveValue::Set(Some(date.fixed_offset())),
                            config: ActiveValue::set(Some(config.clone())),
                            data_id: ActiveValue::NotSet,
                            seq: ActiveValue::Set(Some(seq + 1)),
                            create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
                            update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
                        };
                        entity::task::Entity::insert(task).exec(txn).await?;
                        entity::task_data_download::Entity::insert(task_data_download)
                            .exec(txn)
                            .await?;
                        result.push((task_id, task_data_id));
                    }
                }
                Ok(result)
            })
        })
        .await?;
    Ok(result)
}
