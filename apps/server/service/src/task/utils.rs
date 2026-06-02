use std::{collections::HashMap, path::PathBuf, time::Duration};

use chrono::{DateTime, FixedOffset, TimeDelta, Utc};
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, ConnectionTrait, Condition, EntityTrait,
    QueryFilter, QueryOrder, QuerySelect,
};

use crate::task::download::TaskType;

pub fn get_file_name_by_task_type(task_type: &TaskType) -> String {
    match task_type {
        TaskType::JobDataDownload => "job.zip".to_string(),
        TaskType::CompanyDataDownload => "company.zip".to_string(),
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

pub(crate) const MAX_POLL_INTERVAL: Duration = Duration::from_secs(60);

const TASK_RETRY_MIN_INTERVAL_SECS: i64 = MAX_POLL_INTERVAL.as_secs() as i64;
const TASK_STATUS_ERROR_MAX_RETRY_COUNT: i32 =
    (24i64 * 60 * 60 / TASK_RETRY_MIN_INTERVAL_SECS) as i32;

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

const TASK_QUERY_BATCH_SIZE: usize = 8;
const TASK_QUERY_BATCH_MULTIPLIER: usize = 8;

pub(crate) async fn query_pending_tasks(
    conn: &impl ConnectionTrait,
) -> Result<Vec<entity::task::Model>, anyhow::Error> {
    let cutoff = (Utc::now() - TimeDelta::seconds(TASK_RETRY_MIN_INTERVAL_SECS)).fixed_offset();

    let tasks = entity::task::Entity::find()
        .filter(entity::task::Column::Status.is_in(vec![
            entity::task::Status::Ready,
            entity::task::Status::Running,
            entity::task::Status::Error,
        ]))
        .filter(entity::task::Column::RetryCount.lt(Some(TASK_STATUS_ERROR_MAX_RETRY_COUNT)))
        .filter(
            Condition::any()
                .add(entity::task::Column::Status.ne(entity::task::Status::Error))
                .add(
                    Condition::all()
                        .add(entity::task::Column::Status.eq(entity::task::Status::Error))
                        .add(entity::task::Column::UpdateDatetime.lt(Some(cutoff))),
                ),
        )
        .order_by(entity::task::Column::UpdateDatetime, sea_orm::Order::Asc)
        .limit(TASK_QUERY_BATCH_SIZE as u64 * TASK_QUERY_BATCH_MULTIPLIER as u64)
        .all(conn)
        .await?;
    Ok(tasks)
}

pub(crate) async fn apply_task_result<C: ConnectionTrait>(
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
    active
        .update(conn)
        .await
        .map_err(|e| anyhow::anyhow!("{:?}", e))?;
    Ok(())
}
