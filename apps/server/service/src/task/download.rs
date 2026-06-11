use std::collections::HashMap;

use anyhow::Context;
use chrono::{DateTime, FixedOffset, Utc};
use entity::task::ActiveModel as TaskActiveModel;
use entity::task_data_download::ActiveModel as TaskDataDownloadActiveModel;
use entity::task_data_merge::ActiveModel as TaskDataMergeActiveModel;
use framework::id::gen_id;
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, ConnectionTrait, DatabaseConnection,
    DatabaseTransaction, EntityTrait, IntoActiveModel, QueryFilter, TransactionTrait,
};
use serde::{Deserialize, Serialize};
use strum_macros::{Display, EnumString};

use crate::common::FileParser;
use crate::repo::{
    DownloadError, DownloadFileParam, FileInfo, GitRepo, QueryFileDateAndMaxSeqParam, Repo,
};
use crate::task::error::Error;

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

pub type DateForStartEndAndList = (DateTime<Utc>, DateTime<Utc>, Vec<DateTime<Utc>>);

pub struct QueryDateListParam {
    pub user_name: String,
    pub repo_name: String,
    pub task_type: TaskType,
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
}

pub type DateAndMaxSeq = (DateTime<Utc>, i32);

pub struct SaveDataDownloadTaskParam {
    pub plan_id: String,
    pub task_type: TaskType,
    pub lack_date_max_seq_list: Vec<DateAndMaxSeq>,
    pub url: String,
    pub user_name: String,
    pub repo_name: String,
    pub now: DateTime<Utc>,
}

pub struct ExecuteDownloadTaskAndCreateMergeTaskParam {
    pub download_task_id: String,
    pub now: DateTime<Utc>,
}

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
    let lack_date_max_seq_list = calculate_lack_date_max_seq_list(
        &repo_asc_date_list,
        &db_date_list,
        &repo_file_date_and_max_seq_map,
    )?;
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

fn get_file_name_by_task_type(task_type: &TaskType) -> String {
    crate::task::utils::get_file_name_by_task_type(task_type)
}

fn get_file_name_by_task_data_download_type(
    download_data_task_type: &entity::task_data_download::Type,
) -> String {
    match download_data_task_type {
        entity::task_data_download::Type::JobDataDownload => "job.xlsx".to_string(),
        entity::task_data_download::Type::CompanyDataDownload => "company.xlsx".to_string(),
    }
}

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
        .filter(entity::task_data_download::Column::UserName.eq(Some(user_name.to_string())))
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
                        let seq_file_name =
                            crate::task::utils::get_file_name_by_seq(&file_name, seq)?;
                        let config = serde_json::to_value(&TaskDataDownloadConfig {
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
                            user_name: ActiveValue::Set(Some(user_name.clone())),
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

pub struct DownloadTaskResult {
    pub download_task_id: String,
    pub file_id: String,
    pub file_name: Option<String>,
    pub content: Vec<u8>,
    pub size: i64,
    pub sha: String,
    pub plan_id: String,
    pub task_data_id: String,
    pub merge_task_type: entity::task::Type,
    pub merge_data_task_type: entity::task_data_merge::Type,
    pub total: u32,
    pub page_size: u32,
    pub total_page: u32,
    pub merge_config: serde_json::Value,
    pub datetime: DateTime<FixedOffset>,
    pub user_name: Option<String>,
    pub repo_name: Option<String>,
}

pub async fn download_task_file(
    conn: &DatabaseConnection,
    param: ExecuteDownloadTaskAndCreateMergeTaskParam,
) -> Result<DownloadTaskResult, Error> {
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

    let crate::task::plan::TaskPlanConfigDataDownloadConfig { token, .. } =
        serde_json::from_value(config.context("task plan config not found")?)
            .context("parse task plan config failure")?;

    let data_id = data_id.ok_or_else(|| anyhow::anyhow!("Download task has no data_id"))?;
    let task_data_download = entity::task_data_download::Entity::find_by_id(data_id.to_string())
        .one(conn)
        .await?
        .ok_or_else(|| anyhow::anyhow!("Task data download not found data_id = {}", data_id))?;

    let entity::task_data_download::Model {
        config: download_config,
        datetime,
        r#type: download_type,
        user_name,
        repo_name,
        ..
    } = task_data_download.clone();

    let download_config = download_config
        .ok_or_else(|| anyhow::anyhow!("Task config not found for data_id = {}", data_id))?;
    let TaskDataDownloadConfig { url, file_name } =
        serde_json::from_value(download_config).context("parse config json failure")?;
    let merge_config = crate::task::merge::TaskDataMergeConfig {
        url: url.clone(),
        file_name: file_name.clone(),
    };
    let merge_config =
        serde_json::to_value(&merge_config).context("merge config to json value failure")?;
    let url =
        url.ok_or_else(|| anyhow::anyhow!("Task config url not found for data_id = {}", data_id))?;
    let download_type = download_type.context("download type not exists")?;
    let repo = GitRepo::new();
    let datetime = datetime.context("download data task datetime not found")?;
    let file_name = file_name.context("file name not found")?;
    let path = format!("{}/{}", datetime.format("%Y/%m-%d"), file_name);
    let FileInfo {
        content,
        file_name,
        size,
        sha,
    } = match repo
        .download_file(DownloadFileParam {
            url,
            datetime: datetime.to_utc(),
            file_name,
            token,
        })
        .await
    {
        Ok(info) => info,
        Err(e) => match e {
            DownloadError::Timeout => {
                return Err(Error::DownloadTimeout(format!(
                    "download timeout for path: {}",
                    path
                )));
            }
            DownloadError::FileNotFound(p) => {
                let one_day = chrono::Duration::days(1);
                if now - datetime.to_utc() >= one_day {
                    return Err(Error::FinishedButError(format!("file {} never upload", p)));
                }
                return Err(Error::Internal(anyhow::anyhow!(
                    "file {} not found, retry later",
                    p
                )));
            }
            DownloadError::Internal(err) => return Err(Error::Internal(err)),
        },
    };

    let file_id = gen_id();

    let excel_data = FileParser::parse_excel(&FileParser::unzip(
        &content,
        &get_file_name_by_task_data_download_type(&download_type),
    )?)?;

    if excel_data.is_empty() {
        return Err(Error::FinishedButError("excel no data".to_string()));
    }

    let headers = &excel_data[0];

    match &download_type {
        entity::task_data_download::Type::JobDataDownload => {
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

    Ok(DownloadTaskResult {
        download_task_id,
        file_id,
        file_name,
        content,
        size,
        sha,
        plan_id,
        task_data_id: data_id,
        merge_task_type,
        merge_data_task_type,
        total,
        page_size,
        total_page,
        merge_config,
        datetime,
        user_name,
        repo_name,
    })
}

pub async fn save_download_task_results(
    txn: &DatabaseTransaction,
    result: DownloadTaskResult,
    now: DateTime<Utc>,
) -> Result<(), anyhow::Error> {
    let task_data_download_model =
        entity::task_data_download::Entity::find_by_id(result.task_data_id.to_string())
            .one(txn)
            .await?
            .ok_or_else(|| {
                anyhow::anyhow!("Task data download not found id = {}", result.task_data_id)
            })?;
    let mut task_data_download_active = task_data_download_model.into_active_model();
    task_data_download_active.data_id = ActiveValue::Set(Some(result.file_id.to_string()));
    task_data_download_active.update_datetime = ActiveValue::Set(Some(now.fixed_offset()));
    task_data_download_active.update(txn).await?;

    let file = entity::file::ActiveModel {
        id: ActiveValue::Set(result.file_id.to_string()),
        name: ActiveValue::Set(result.file_name),
        sha: ActiveValue::Set(Some(result.sha)),
        content: ActiveValue::Set(Some(result.content)),
        size: ActiveValue::Set(Some(result.size)),
        is_delete: ActiveValue::Set(Some(false)),
        create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
        update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
    };
    file.insert(txn).await?;

    for page_num in 1..=result.total_page {
        let merge_task_id = gen_id();
        let merge_data_id = gen_id();
        let merge_task = TaskActiveModel {
            id: ActiveValue::Set(merge_task_id.clone()),
            plan_id: ActiveValue::Set(Some(result.plan_id.clone())),
            r#type: ActiveValue::Set(Some(result.merge_task_type.clone())),
            data_id: ActiveValue::Set(Some(merge_data_id.clone())),
            status: ActiveValue::Set(Some(entity::task::Status::Ready)),
            error_reason: ActiveValue::Set(None),
            cost_time: ActiveValue::Set(Some(0)),
            retry_count: ActiveValue::Set(Some(0)),
            create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
            update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
        };
        let task_data_merge = TaskDataMergeActiveModel {
            id: ActiveValue::Set(merge_data_id.clone()),
            r#type: ActiveValue::Set(Some(result.merge_data_task_type.clone())),
            user_name: ActiveValue::Set(result.user_name.clone()),
            repo_name: ActiveValue::Set(result.repo_name.clone()),
            datetime: ActiveValue::Set(Some(result.datetime)),
            data_id: ActiveValue::Set(Some(result.file_id.to_string())),
            data_count: ActiveValue::Set(Some(result.total as i32)),
            config: ActiveValue::Set(Some(result.merge_config.clone())),
            data_page_num: ActiveValue::Set(Some(page_num as i32)),
            data_page_size: ActiveValue::Set(Some(result.page_size as i32)),
            create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
            update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
        };
        entity::task::Entity::insert(merge_task).exec(txn).await?;
        entity::task_data_merge::Entity::insert(task_data_merge)
            .exec(txn)
            .await?;
    }

    Ok(())
}
