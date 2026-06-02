pub mod scheduler;

use std::{collections::HashMap, path::PathBuf, str::FromStr};

use anyhow::Context;
use chrono::{DateTime, FixedOffset, Utc};
use cron::Schedule;
use entity::task::ActiveModel as TaskActiveModel;
use entity::task_data_download::ActiveModel as TaskDataDownloadActiveModel;
use entity::task_data_merge::ActiveModel as TaskDataMergeActiveModel;
use entity::task_data_plan::ActiveModel as TaskDataPlanActiveModel;
use entity::task_plan::ActiveModel as TaskPlanActiveModel;
use framework::id::gen_id;
use reqwest::Url;
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, ConnectionTrait, DbErr, EntityTrait,
    IntoActiveModel, QueryFilter, QueryOrder, QuerySelect, TransactionTrait,
};
use serde::{Deserialize, Serialize};
use strum_macros::{Display, EnumString};

use thiserror::Error;

use crate::sync::{CompanyImporter, ImportResult, JobImporter};
use crate::{
    common::{FileError, FileParser},
    repo::{DownloadFileParam, FileInfo, GitRepo, QueryFileDateAndMaxSeqParam, Repo},
};

#[derive(Debug, Error)]
pub enum Error {
    #[error(transparent)]
    File(#[from] FileError),

    #[error("invalid cron expr: {0}")]
    Cron(String),

    #[error("{0}")]
    FinishedButError(String),

    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

impl From<sea_orm::DbErr> for Error {
    fn from(err: sea_orm::DbErr) -> Self {
        Error::Internal(err.into())
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct TaskPlanConfigDataDownloadConfig {
    pub task_type_list: Vec<TaskType>,
    pub url: Option<String>,
    pub user_name: Option<String>,
    pub repo_name: Option<String>,
    pub token: Option<String>,
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
    pub file_name: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct TaskDataMergeConfig {
    pub url: Option<String>,
    pub file_name: Option<String>,
}

fn gen_url_by_repo_type(repo_type: &RepoType, user_name: &str, repo_name: &str) -> String {
    match repo_type {
        RepoType::Github => format!("https://github.com/{}/{}", user_name, repo_name),
    }
}

fn validate_cron(expr: &str) -> bool {
    Schedule::from_str(expr).is_ok()
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

pub fn get_file_name_by_task_type(task_type: &TaskType) -> String {
    match task_type {
        TaskType::JobDataDownload => "job.zip".to_string(),
        TaskType::CompanyDataDownload => "company.zip".to_string(),
    }
}

pub fn get_file_name_by_task_data_download_type(
    download_data_task_type: &entity::task_data_download::Type,
) -> String {
    match download_data_task_type {
        entity::task_data_download::Type::JobDataDownload => "job.xlsx".to_string(),
        entity::task_data_download::Type::CompanyDataDownload => "company.xlsx".to_string(),
    }
}

pub fn get_file_name_by_task_data_merge_type(
    download_data_task_type: &entity::task_data_merge::Type,
) -> String {
    match download_data_task_type {
        entity::task_data_merge::Type::JobDataMerge => "job.xlsx".to_string(),
        entity::task_data_merge::Type::CompanyDataMerge => "company.xlsx".to_string(),
    }
}

pub fn get_file_name_by_seq(file_name: &str, seq: i32) -> Result<String, anyhow::Error> {
    let path = PathBuf::from(file_name);
    let name: String = path
        .file_prefix()
        .ok_or_else(|| anyhow::anyhow!("File name not exists"))?
        .to_str()
        .ok_or_else(|| anyhow::anyhow!("Invalid file name"))?
        .to_string();
    let ext: String = path
        .extension()
        .ok_or_else(|| anyhow::anyhow!("File extension not exists"))?
        .to_str()
        .ok_or_else(|| anyhow::anyhow!("Invalid file extension"))?
        .to_string();
    if seq > 0 {
        Ok(format!("{}_{}.{}", name, seq, ext))
    } else {
        Ok(format!("{}.{}", name, ext))
    }
}

pub struct CalculateAndCreateDownloadTaskParam {
    pub plan_id: String,
    pub user_name: String,
    pub repo_name: String,
    pub task_type: TaskType,
    pub now: DateTime<Utc>,
    pub file_name: String,
    pub url: String,
    pub token: Option<String>,
    pub retention_day: i32,
}

pub type TaskAndDataId = (String, String);

pub async fn calculate_and_create_download_task<C: TransactionTrait + ConnectionTrait>(
    conn: &C,
    param: CalculateAndCreateDownloadTaskParam,
) -> Result<Vec<TaskAndDataId>, Error> {
    let CalculateAndCreateDownloadTaskParam {
        plan_id,
        user_name,
        repo_name,
        task_type,
        now,
        file_name,
        url,
        token,
        retention_day,
    } = param;

    let repo = GitRepo::new();

    // 根据task_type,datetime,seq,url,user_name,repo_name,生成data download task
    // 1. 根据文件名,url,获得仓库所有文件的路径和maxSeq
    let repo_file_date_and_max_seq_map = repo
        .query_file_date_and_max_seq(QueryFileDateAndMaxSeqParam {
            file_name,
            url: url.to_string(),
            token,
            now,
            retention_day,
        })
        .await?;
    let (start_date, end_date, repo_asc_date_list) =
        filter_sort_fetch_date_info(&repo_file_date_and_max_seq_map)?;
    // 2. 根据数据库查询，获得数据库区间时间范围的记录
    let db_date_list = query_date_list(
        conn,
        QueryDateListParam {
            user_name: user_name.to_string(),
            repo_name: repo_name.to_string(),
            task_type: task_type.clone(),
            start_date,
            end_date,
        },
    )
    .await?;
    // 3. 根据仓库记录日期和数据库记录日期，计算缺失的日期
    let lack_date_max_seq_list = calculate_lack_date_max_seq_list(
        &repo_asc_date_list,
        &db_date_list,
        &repo_file_date_and_max_seq_map,
    )?;
    // 4. 根据缺失日期及对应maxSeq，user_name,repo_name,task_type,生成 data download task
    let task_ids = save_data_download_task(
        conn,
        SaveDataDownloadTaskParam {
            plan_id,
            task_type,
            lack_date_max_seq_list,
            url,
            user_name,
            repo_name,
            now,
        },
    )
    .await?;
    Ok(task_ids)
}

pub type DateForStartEndAndList = (DateTime<Utc>, DateTime<Utc>, Vec<DateTime<Utc>>);

fn filter_sort_fetch_date_info(
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

pub struct QueryDateListParam {
    pub user_name: String,
    pub repo_name: String,
    pub task_type: TaskType,
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
}

async fn query_date_list<C: ConnectionTrait>(
    conn: &C,
    param: QueryDateListParam,
) -> Result<Vec<DateTime<Utc>>, anyhow::Error> {
    let QueryDateListParam {
        user_name,
        repo_name,
        task_type,
        start_date,
        end_date,
    } = param;
    let task_type_param = match task_type {
        TaskType::JobDataDownload => entity::task_data_download::Type::JobDataDownload,
        TaskType::CompanyDataDownload => entity::task_data_download::Type::CompanyDataDownload,
    };
    let items = entity::task_data_download::Entity::find()
        .filter(entity::task_data_download::Column::Username.eq(Some(user_name.to_string())))
        .filter(entity::task_data_download::Column::RepoName.eq(Some(repo_name.to_string())))
        .filter(entity::task_data_download::Column::Type.eq(Some(task_type_param)))
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

fn calculate_lack_date_max_seq_list(
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

pub struct SaveDataDownloadTaskParam {
    pub plan_id: String,
    pub task_type: TaskType,
    pub lack_date_max_seq_list: Vec<DateAndMaxSeq>,
    pub url: String,
    pub user_name: String,
    pub repo_name: String,
    pub now: DateTime<Utc>,
}

async fn save_data_download_task<C: TransactionTrait>(
    conn: &C,
    param: SaveDataDownloadTaskParam,
) -> Result<Vec<TaskAndDataId>, anyhow::Error> {
    let SaveDataDownloadTaskParam {
        plan_id,
        task_type,
        lack_date_max_seq_list,
        url,
        user_name,
        repo_name,
        now,
    } = param;
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
    let result = conn
        .transaction::<_, _, anyhow::Error>(|txn| {
            Box::pin(async move {
                let mut result = vec![];
                let file_name = get_file_name_by_task_type(&task_type);
                for (date, max_seq) in lack_date_max_seq_list {
                    for seq in 0..max_seq {
                        let seq_file_name = get_file_name_by_seq(&file_name, seq)?;
                        let config = serde_json::to_string(&TaskDataDownloadConfig {
                            url: Some(url.to_string()),
                            file_name: Some(seq_file_name),
                        })?;
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
                            config: ActiveValue::Set(Some(config)),
                            data_id: ActiveValue::NotSet,
                            seq: ActiveValue::Set(Some(seq)),
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

fn get_file_max_record_count_by_task_type(task_type: &entity::task_data_download::Type) -> u32 {
    match task_type {
        entity::task_data_download::Type::JobDataDownload => 6000,
        entity::task_data_download::Type::CompanyDataDownload => 6000,
    }
}

pub struct ExecuteDownloadTaskAndCreateMergeTaskParam {
    pub download_task_id: String,
    pub now: DateTime<Utc>,
}

pub async fn execute_download_task_and_create_merge_task<C: TransactionTrait + ConnectionTrait>(
    conn: &C,
    param: ExecuteDownloadTaskAndCreateMergeTaskParam,
) -> Result<Vec<TaskAndDataId>, Error> {
    let ExecuteDownloadTaskAndCreateMergeTaskParam {
        download_task_id,
        now,
    } = param;
    let entity::task::Model {
        data_id,
        r#type,
        plan_id,
        ..
    } = entity::task::Entity::find_by_id(download_task_id.to_string())
        .one(conn)
        .await?
        .ok_or_else(|| anyhow::anyhow!("Download task not found id = {}", download_task_id))?;

    let plan_id = plan_id.context("plan id not found")?;
    let entity::task_plan::Model { config, .. } =
        entity::task_plan::Entity::find_by_id(plan_id.to_string())
            .one(conn)
            .await?
            .ok_or_else(|| anyhow::anyhow!("task plan not found id = {}", plan_id))?;

    let TaskPlanConfigDataDownloadConfig { token, .. } =
        serde_json::from_str(&config.context("task plan config not found")?)
            .context("parse task plan config failure")?;

    let data_id = data_id.ok_or_else(|| anyhow::anyhow!("Download task has no data_id"))?;
    let task_data_download = entity::task_data_download::Entity::find_by_id(data_id.to_string())
        .one(conn)
        .await?
        .ok_or_else(|| anyhow::anyhow!("Task data download not found data_id = {}", data_id))?;

    let entity::task_data_download::Model {
        config,
        datetime,
        r#type: download_type,
        ..
    } = task_data_download.clone();

    let config =
        config.ok_or_else(|| anyhow::anyhow!("Task config not found for data_id = {}", data_id))?;
    let TaskDataDownloadConfig { url, file_name } = serde_json::from_str(&config)
        .context(format!("parse config json failure,str = {}", config))?;
    let merge_config = TaskDataMergeConfig {
        url: url.clone(),
        file_name: file_name.clone(),
    };
    let merge_config =
        serde_json::to_string(&merge_config).context("merge config to json string failure")?;
    let url =
        url.ok_or_else(|| anyhow::anyhow!("Task config url not found for data_id = {}", data_id))?;
    let download_type = download_type.context("download type not exists")?;
    let repo = GitRepo::new();
    let datetime = datetime.context("download data task datetime not found")?;
    let file_name = file_name.context("file name not found")?;
    // execulate download task
    let FileInfo {
        content,
        file_name,
        size,
    } = repo
        .download_file(DownloadFileParam {
            url,
            datetime: datetime.to_utc(),
            file_name,
            token,
        })
        .await?;

    let file_id = gen_id();

    let excel_data = FileParser::parse_excel(&FileParser::unzip(
        &content,
        &get_file_name_by_task_data_download_type(&download_type),
    )?)?;

    // 空数据处理
    if excel_data.is_empty() {
        return Err(Error::FinishedButError("excel no data".to_string()));
    }

    let headers = &excel_data[0];

    match &download_type {
        entity::task_data_download::Type::JobDataDownload => {
            // 验证表头
            let (valid, version, actual_version, lack_columns, _) =
                FileParser::validate_job_headers(headers);
            if !valid {
                let msg = format!(
                    "invalid header version:{}/{},lack_columns len:{}",
                    version,
                    actual_version,
                    lack_columns.len()
                );
                return Err(Error::FinishedButError(msg));
            }
        }
        entity::task_data_download::Type::CompanyDataDownload => {
            let (valid, version, actual_version, lack_columns, _) =
                FileParser::validate_company_headers(headers);
            if !valid {
                let msg = format!(
                    "invalid header version:{}/{},lack_columns len:{}",
                    version,
                    actual_version,
                    lack_columns.len()
                );
                return Err(Error::FinishedButError(msg));
            }
        }
    }
    // -1 remove header row
    let total = (excel_data.len() - 1) as u32;
    let page_size = get_file_max_record_count_by_task_type(&download_type);
    let mut total_page = total.div_ceil(page_size);
    if total_page <= 1 {
        total_page = 1;
    }
    let merge_task_type = match &r#type {
        Some(t) => match t {
            entity::task::Type::JobDataDownload => entity::task::Type::JobDataMerge,
            entity::task::Type::CompanyDataDownload => entity::task::Type::CompanyDataMerge,
            _ => Err(anyhow::anyhow!(
                "Task type invalid,must be download type for id = {}",
                download_task_id
            ))?,
        },
        None => Err(anyhow::anyhow!(
            "Task type not exists for id = {}",
            download_task_id
        ))?,
    };
    let merge_data_task_type = match &r#type {
        Some(t) => match t {
            entity::task::Type::JobDataDownload => entity::task_data_merge::Type::JobDataMerge,
            entity::task::Type::CompanyDataDownload => {
                entity::task_data_merge::Type::CompanyDataMerge
            }
            _ => Err(anyhow::anyhow!(
                "Task type invalid,must be download type for id = {}",
                download_task_id
            ))?,
        },
        None => Err(anyhow::anyhow!(
            "Task type not exists for id = {}",
            download_task_id
        ))?,
    };

    let result = conn
        .transaction::<_, _, anyhow::Error>(|txn| {
            Box::pin(async move {
                // update download task
                let mut task_data_download_model = task_data_download.into_active_model();
                task_data_download_model.data_id = ActiveValue::Set(Some(file_id.clone()));
                task_data_download_model.update(txn).await?;
                // insert file
                let file = entity::file::ActiveModel {
                    id: ActiveValue::Set(file_id.to_string()),
                    name: ActiveValue::Set(file_name),
                    sha: ActiveValue::NotSet,
                    content: ActiveValue::Set(Some(content)),
                    size: ActiveValue::Set(Some(size)),
                    is_delete: ActiveValue::Set(Some(false)),
                    create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
                    update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
                };
                file.insert(txn).await?;
                // update task
                let task = entity::task::Entity::find_by_id(download_task_id.to_string())
                    .one(txn)
                    .await?
                    .ok_or_else(|| {
                        anyhow::anyhow!("Download task not found id = {}", download_task_id)
                    })?;
                let task_data_id = &task
                    .data_id
                    .clone()
                    .ok_or_else(|| anyhow::anyhow!("Download task has no data_id"))?;
                let plan_id = &task
                    .plan_id
                    .clone()
                    .ok_or_else(|| anyhow::anyhow!("Download task has no plan_id"))?;

                // update task_data_download
                let task_data_download =
                    &entity::task_data_download::Entity::find_by_id(task_data_id.to_string())
                        .one(txn)
                        .await?
                        .ok_or_else(|| {
                            anyhow::anyhow!("Download data task not found id = {}", task_data_id)
                        })?;
                let username = &task_data_download.username;
                let repo_name = &task_data_download.repo_name;
                let mut task_data_download_active_model =
                    task_data_download.clone().into_active_model();
                task_data_download_active_model.data_id =
                    ActiveValue::Set(Some(file_id.to_string()));
                task_data_download_active_model.update_datetime =
                    ActiveValue::Set(Some(now.fixed_offset()));
                task_data_download_active_model.update(txn).await?;
                let mut result = vec![];
                for page_num in 1..=total_page {
                    // create_merge_task
                    let task_id = gen_id();
                    let task_data_id = gen_id();
                    let task = TaskActiveModel {
                        id: ActiveValue::Set(task_id.clone()),
                        plan_id: ActiveValue::Set(Some(plan_id.clone())),
                        r#type: ActiveValue::Set(Some(merge_task_type.clone())),
                        data_id: ActiveValue::Set(Some(task_data_id.clone())),
                        status: ActiveValue::Set(Some(entity::task::Status::Ready)),
                        error_reason: ActiveValue::Set(None),
                        cost_time: ActiveValue::Set(Some(0)),
                        retry_count: ActiveValue::Set(Some(0)),
                        create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
                        update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
                    };
                    let task_data_merge = TaskDataMergeActiveModel {
                        id: ActiveValue::Set(task_data_id.clone()),
                        r#type: ActiveValue::Set(Some(merge_data_task_type.clone())),
                        username: ActiveValue::Set(username.clone()),
                        repo_name: ActiveValue::Set(repo_name.clone()),
                        datetime: ActiveValue::Set(Some(datetime)),
                        data_id: ActiveValue::Set(Some(file_id.to_string())),
                        data_count: ActiveValue::Set(Some(total as i32)),
                        config: ActiveValue::Set(Some(merge_config.to_string())),
                        data_page_num: ActiveValue::Set(Some(page_num as i32)),
                        data_page_size: ActiveValue::Set(Some(page_size as i32)),
                        create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
                        update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
                    };
                    entity::task::Entity::insert(task).exec(txn).await?;
                    entity::task_data_merge::Entity::insert(task_data_merge)
                        .exec(txn)
                        .await?;
                    result.push((task_id, task_data_id));
                }
                Ok(result)
            })
        })
        .await
        .map_err(|e| match e {
            sea_orm::TransactionError::Connection(db_err) => db_err.into(),
            sea_orm::TransactionError::Transaction(db_err) => db_err,
        })?;
    Ok(result)
}

pub struct ExecuteMergeTaskParam {
    pub merge_task_id: String,
    pub now: DateTime<Utc>,
}

pub type DataCount = i32;

pub async fn execute_merge_task<C: TransactionTrait + ConnectionTrait>(
    conn: &C,
    param: ExecuteMergeTaskParam,
) -> Result<DataCount, Error> {
    let ExecuteMergeTaskParam { merge_task_id, now } = param;
    // query task
    let task = entity::task::Entity::find_by_id(merge_task_id.clone())
        .one(conn)
        .await?
        .context(format!("task not found by id = {}", merge_task_id))?;
    let entity::task::Model { data_id, .. } = task.clone();
    let merge_data_task_id = data_id.context("merge data task id not exists")?;
    // query merge data task
    let merge_data_task = entity::task_data_merge::Entity::find_by_id(merge_data_task_id.clone())
        .one(conn)
        .await?
        .context(format!(
            "merge data task not found by id = {}",
            merge_data_task_id
        ))?;
    let entity::task_data_merge::Model {
        r#type,
        username,
        repo_name,
        data_id,
        data_page_num,
        data_page_size,
        config,
        datetime,
        ..
    } = merge_data_task.clone();
    let file_id = data_id.context("file id not exists")?;
    let merge_type = r#type.context("merge data task not exists")?;
    // query file data
    let file = entity::file::Entity::find_by_id(file_id.clone())
        .one(conn)
        .await?
        .context(format!("file not found by id = {}", file_id))?;
    let entity::file::Model {
        id,
        name: file_name,
        content,
        ..
    } = file;
    let file_content = content.context(format!("file content not exists id = {}", id))?;
    // convert file data
    let excel_data = FileParser::parse_excel(&FileParser::unzip(
        &file_content,
        &get_file_name_by_task_data_merge_type(&merge_type),
    )?)?;
    //sub excel_data
    let page_num = data_page_num.context("page num not exists")?;
    let page_size = data_page_size.context("page size not exists")?;
    let total = excel_data.len();
    let row_start_index = ((page_num - 1) * page_size) as usize;
    let row_end_index = (page_num * page_size).min(total as i32) as usize;
    if row_start_index > total || row_end_index > total {
        let msg = format!(
            "data read out of index,total={},start={},end={}",
            total, row_start_index, row_end_index
        );
        return Err(Error::FinishedButError(msg));
    }
    let excel_data = excel_data[row_start_index..row_end_index].to_vec();
    let mut merge_data_task_active_model = merge_data_task.into_active_model();
    let username = username.context("username not found")?;
    let repo_name = repo_name.context("repo name not found")?;
    let TaskDataMergeConfig { url, .. } =
        serde_json::from_str(&config.context("merge config not exists")?)
            .context("parse merge config json string failure")?;
    let url = url.context("url not found in task data merge config")?;
    let parsed_url = Url::parse(&url).expect("failed to parse url");
    let host = parsed_url.host_str().context("host not found")?;
    let datetime = datetime.context("datetime not found")?;
    let file_name = file_name.context("file name not found")?;
    let path = format!(
        "{}/{}/{}/{}",
        username,
        repo_name,
        datetime.format("%Y/%m-%d"),
        file_name
    );
    let uri = format!("data://{}@{}/{}", username, host, path);
    // transaction start
    let result = conn
        .transaction::<_, _, anyhow::Error>(|txn| {
            Box::pin(async move {
                // import data
                let import_result = match &merge_type {
                    entity::task_data_merge::Type::JobDataMerge => {
                        JobImporter::import(txn, excel_data, &uri)
                            .await
                            .map_err(|e| match e {
                                crate::sync::ImportError::Internal(error) => error,
                            })?
                    }
                    entity::task_data_merge::Type::CompanyDataMerge => {
                        CompanyImporter::import(txn, excel_data, &uri)
                            .await
                            .map_err(|e| match e {
                                crate::sync::ImportError::Internal(error) => error,
                            })?
                    }
                };
                let ImportResult { success, total, .. } = import_result;
                if !success {
                    Err(anyhow::anyhow!("import failure"))?
                }
                // update data merge task
                merge_data_task_active_model.data_count = ActiveValue::Set(Some(total as i32));
                merge_data_task_active_model.update_datetime =
                    ActiveValue::Set(Some(now.fixed_offset()));
                merge_data_task_active_model.update(txn).await?;
                Ok(total as i32)
            })
        })
        .await
        .map_err(|e| match e {
            sea_orm::TransactionError::Connection(db_err) => db_err.into(),
            sea_orm::TransactionError::Transaction(db_err) => db_err,
        })?;
    // transaction end
    Ok(result)
}

const TASK_STATUS_ERROR_MAX_RETRY_COUNT: i32 = 2880;

pub(crate) async fn query_plans_latest_datetime(
    plan_ids: Vec<String>,
    conn: &impl ConnectionTrait,
) -> Result<HashMap<String, Option<DateTime<Utc>>>, anyhow::Error> {
    let create_datetime_max = entity::task::Column::CreateDatetime.max();
    let rows = entity::task::Entity::find()
        .select_only()
        .column(entity::task::Column::PlanId)
        .column_as(create_datetime_max, "latest_datetime")
        .filter(entity::task::Column::PlanId.is_in(plan_ids))
        .group_by(entity::task::Column::PlanId)
        .into_tuple::<(String, Option<DateTime<FixedOffset>>)>()
        .all(conn)
        .await?;
    Ok(rows
        .into_iter()
        .map(|(pid, dt)| (pid, dt.map(|d| d.to_utc())))
        .collect())
}

pub(crate) async fn query_pending_tasks(
    conn: &impl ConnectionTrait,
) -> Result<Vec<entity::task::Model>, anyhow::Error> {
    let tasks = entity::task::Entity::find()
        .filter(
            entity::task::Column::Status.is_in(vec![
                entity::task::Status::Ready,
                entity::task::Status::Running,
                entity::task::Status::Error,
            ]),
        )
        .filter(
            entity::task::Column::RetryCount
                .lt(Some(TASK_STATUS_ERROR_MAX_RETRY_COUNT)),
        )
        .order_by(entity::task::Column::CreateDatetime, sea_orm::Order::Asc)
        .limit(100)
        .all(conn)
        .await?;
    Ok(tasks)
}

async fn apply_task_result<C: ConnectionTrait>(
    mut active: entity::task::ActiveModel,
    status: entity::task::Status,
    error_reason: Option<String>,
    cost_time: Option<i32>,
    retry_count: Option<i32>,
    now: DateTime<Utc>,
    conn: &C,
) -> Result<(), anyhow::Error> {
    active.status = ActiveValue::Set(Some(status));
    if let Some(reason) = error_reason {
        active.error_reason = ActiveValue::Set(Some(reason));
    }
    if let Some(cost) = cost_time {
        active.cost_time = ActiveValue::Set(Some(cost));
    }
    if let Some(retry) = retry_count {
        active.retry_count = ActiveValue::Set(Some(retry));
    }
    active.update_datetime = ActiveValue::Set(Some(now.fixed_offset()));
    active.update(conn).await.map_err(|e| anyhow::anyhow!("{:?}", e))?;
    Ok(())
}
