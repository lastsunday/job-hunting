use anyhow::Context;
use chrono::{DateTime, Utc};
use reqwest::Url;
use sea_orm::{
    ActiveModelTrait, ActiveValue, ConnectionTrait, EntityTrait, IntoActiveModel,
    TransactionTrait,
};
use serde::{Deserialize, Serialize};

use crate::common::FileParser;
use crate::sync::{CompanyImporter, ImportResult, JobImporter};
use crate::task::error::Error;

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct TaskDataMergeConfig {
    pub url: Option<String>,
    pub file_name: Option<String>,
}

pub type DataCount = i32;

pub struct ExecuteMergeTaskParam {
    pub merge_task_id: String,
    pub now: DateTime<Utc>,
}

fn get_file_name_by_task_data_merge_type(
    download_data_task_type: &entity::task_data_merge::Type,
) -> String {
    match download_data_task_type {
        entity::task_data_merge::Type::JobDataMerge => "job.xlsx".to_string(),
        entity::task_data_merge::Type::CompanyDataMerge => "company.xlsx".to_string(),
    }
}

pub async fn execute_merge_task<C: TransactionTrait + ConnectionTrait>(
    conn: &C,
    param: ExecuteMergeTaskParam,
) -> Result<DataCount, Error> {
    let ExecuteMergeTaskParam { merge_task_id, now } = param;
    let task = entity::task::Entity::find_by_id(merge_task_id.clone())
        .one(conn)
        .await?
        .context(format!("task not found by id = {}", merge_task_id))?;
    let entity::task::Model { data_id, .. } = task.clone();
    let merge_data_task_id = data_id.context("merge data task id not exists")?;
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
    let excel_data = FileParser::parse_excel(&FileParser::unzip(
        &file_content,
        &get_file_name_by_task_data_merge_type(&merge_type),
    )?)?;
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
    let result = conn
        .transaction::<_, _, anyhow::Error>(|txn| {
            Box::pin(async move {
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
    Ok(result)
}
