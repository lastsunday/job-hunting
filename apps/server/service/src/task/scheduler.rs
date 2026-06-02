use std::collections::HashMap;
use std::str::FromStr;
use std::sync::Arc;
use std::sync::OnceLock;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

const MAX_TASK_CONCURRENCY: usize = 8;
const TASK_TIMEOUT: Duration = Duration::from_secs(300);

use chrono::{DateTime, Utc};
use cron::Schedule;
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel,
    Order, QueryFilter, QueryOrder, QuerySelect, TransactionTrait,
};
use tokio::sync::Semaphore;
use tokio::sync::watch;

use crate::task::{
    CalculateAndCreateDownloadTaskParam, Error as TaskError,
    ExecuteDownloadTaskAndCreateMergeTaskParam, ExecuteMergeTaskParam, MAX_POLL_INTERVAL,
    TaskPlanConfigDataDownloadConfig, calculate_and_create_download_task,
    execute_download_task_and_create_merge_task, execute_merge_task, get_file_name_by_task_type,
    query_pending_tasks, query_plans_latest_datetime,
};

static SCHEDULER_RUNNING: AtomicBool = AtomicBool::new(false);
static SCHEDULER_SHUTDOWN: OnceLock<watch::Sender<bool>> = OnceLock::new();

pub fn is_scheduler_running() -> bool {
    SCHEDULER_RUNNING.load(Ordering::Relaxed)
}

pub fn stop_scheduler() {
    if let Some(tx) = SCHEDULER_SHUTDOWN.get() {
        let _ = tx.send(true);
    }
}

pub struct SchedulerConfig {
    pub history_file_max_size: i64,
}

pub fn start_scheduler(conn: DatabaseConnection, config: SchedulerConfig) {
    if SCHEDULER_RUNNING
        .compare_exchange(false, true, Ordering::AcqRel, Ordering::Relaxed)
        .is_err()
    {
        tracing::warn!("scheduler already running, skipping");
        return;
    }

    let (shutdown_tx, shutdown_rx) = watch::channel(false);
    let _ = SCHEDULER_SHUTDOWN.set(shutdown_tx);

    tokio::spawn(async move {
        let mut shutdown_rx = shutdown_rx;
        let sleep = tokio::time::sleep(Duration::ZERO);
        tokio::pin!(sleep);

        loop {
            tokio::select! {
                _ = sleep.as_mut() => {
                    let start = std::time::Instant::now();
                    tracing::info!("background task run started");

                    if let Err(e) = process_all_plans(&conn).await {
                        tracing::error!("process plans error: {:?}", e);
                    }
                    if let Err(e) = drain_tasks(&conn).await {
                        tracing::error!("drain tasks error: {:?}", e);
                    }
                    if let Err(e) = run_scheduled_tasks(&conn, config.history_file_max_size).await {
                        tracing::error!("scheduled tasks error: {:?}", e);
                    }

                    tracing::info!("background task run completed in {:?}", start.elapsed());

                    let now = Utc::now();
                    let max_wake = now + chrono::TimeDelta::from_std(MAX_POLL_INTERVAL)
                        .unwrap_or_else(|_| chrono::TimeDelta::seconds(60));
                    let wake_at = compute_next_cron_wake(&conn)
                        .await
                        .map(|t| if t < max_wake { t } else { max_wake })
                        .unwrap_or(max_wake);
                    let duration = (wake_at - now)
                        .to_std()
                        .unwrap_or(MAX_POLL_INTERVAL);
                    sleep.set(tokio::time::sleep(duration));
                }
                _ = shutdown_rx.changed() => {
                    if *shutdown_rx.borrow() {
                        SCHEDULER_RUNNING.store(false, Ordering::Relaxed);
                        tracing::info!("scheduler stopped");
                        break;
                    }
                }
            }
        }
    });
}

struct PlanRunContext {
    plans: Vec<entity::task_plan::Model>,
    plan_data_plans: HashMap<String, Vec<entity::task_data_plan::Model>>,
    latest_datetimes: HashMap<String, Option<DateTime<Utc>>>,
}

async fn fetch_task_plans_with_metadata(
    conn: &DatabaseConnection,
) -> Result<PlanRunContext, anyhow::Error> {
    let plans = entity::task_plan::Entity::find()
        .filter(entity::task_plan::Column::Enable.eq(Some(true)))
        .all(conn)
        .await?;

    let plan_ids: Vec<_> = plans.iter().map(|p| p.id.clone()).collect();
    let latest_datetimes = query_plans_latest_datetime(plan_ids.clone(), conn).await?;
    let all_data_plans = entity::task_data_plan::Entity::find()
        .filter(entity::task_data_plan::Column::PlanId.is_in(plan_ids))
        .all(conn)
        .await?;

    let mut plan_data_plans: HashMap<String, Vec<entity::task_data_plan::Model>> = HashMap::new();
    for dp in all_data_plans {
        if let Some(ref pid) = dp.plan_id {
            plan_data_plans.entry(pid.clone()).or_default().push(dp);
        }
    }

    Ok(PlanRunContext {
        plans,
        plan_data_plans,
        latest_datetimes,
    })
}

fn should_plan_run(cron_expr: &str, last_run: Option<DateTime<Utc>>) -> bool {
    let schedule = match Schedule::from_str(cron_expr) {
        Ok(s) => s,
        Err(e) => {
            tracing::warn!("invalid cron expr: {}", e);
            return false;
        }
    };
    let now = Utc::now();
    match last_run {
        Some(last_time) => schedule
            .after(&last_time)
            .next()
            .is_some_and(|next| next <= now),
        None => true,
    }
}

async fn compute_next_cron_wake(conn: &DatabaseConnection) -> Option<DateTime<Utc>> {
    let plans = entity::task_plan::Entity::find()
        .filter(entity::task_plan::Column::Enable.eq(Some(true)))
        .all(conn)
        .await
        .ok()?;

    let now = Utc::now();
    let mut next: Option<DateTime<Utc>> = None;

    for plan in &plans {
        let cron_str = plan.cron.as_deref().unwrap_or("");
        if cron_str.is_empty() {
            continue;
        }
        let Ok(schedule) = Schedule::from_str(cron_str) else {
            continue;
        };
        if let Some(t) = schedule.after(&now).next() {
            match next {
                Some(n) if t < n => next = Some(t),
                None => next = Some(t),
                _ => {}
            }
        }
    }

    next
}

async fn process_single_plan(
    conn: &DatabaseConnection,
    plan: &entity::task_plan::Model,
    data_plans: Vec<entity::task_data_plan::Model>,
    latest_datetimes: &HashMap<String, Option<DateTime<Utc>>>,
) -> Result<(), anyhow::Error> {
    if let Some(ref cron_expr) = plan.cron
        && !cron_expr.is_empty()
    {
        let reference = latest_datetimes.get(&plan.id).copied().flatten();
        if !should_plan_run(cron_expr, reference) {
            return Ok(());
        }
    }

    let config_str = plan.config.as_deref().unwrap_or("");
    if config_str.is_empty() {
        return Ok(());
    }
    let config: TaskPlanConfigDataDownloadConfig = match serde_json::from_str(config_str) {
        Ok(c) => c,
        Err(e) => {
            tracing::warn!(
                "parse task plan config failure, plan_id={}, error={}",
                plan.id,
                e
            );
            return Ok(());
        }
    };

    let retention_day = 365 * 10;

    for data_plan in data_plans {
        let user_name = data_plan.username.as_deref().unwrap_or("");
        let repo_name = data_plan.repo_name.as_deref().unwrap_or("");
        let url = config.url.as_deref().unwrap_or("");

        for task_type in &config.task_type_list {
            let file_name = get_file_name_by_task_type(task_type);
            let now = Utc::now();

            if let Err(e) = calculate_and_create_download_task(
                conn,
                CalculateAndCreateDownloadTaskParam {
                    plan_id: plan.id.clone(),
                    user_name: user_name.to_string(),
                    repo_name: repo_name.to_string(),
                    task_type: task_type.clone(),
                    now,
                    file_name,
                    url: url.to_string(),
                    token: config.token.clone(),
                    retention_day,
                },
            )
            .await
            {
                tracing::warn!(
                    "calculate download task error, plan_id={}, task_type={:?}, error={:?}",
                    plan.id,
                    task_type,
                    e
                );
            }
        }
    }

    Ok(())
}

pub async fn process_all_plans(conn: &DatabaseConnection) -> Result<(), anyhow::Error> {
    let PlanRunContext {
        plans,
        mut plan_data_plans,
        latest_datetimes,
    } = fetch_task_plans_with_metadata(conn).await?;

    tracing::info!(
        "processing {} plans with {} data_plans",
        plans.len(),
        plan_data_plans.values().map(|v| v.len()).sum::<usize>()
    );

    for plan in &plans {
        let Some(data_plans) = plan_data_plans.remove(&plan.id) else {
            continue;
        };
        if let Err(e) = process_single_plan(conn, plan, data_plans, &latest_datetimes).await {
            tracing::warn!("process plan error, plan_id={}, error={:?}", plan.id, e);
        }
    }

    Ok(())
}

async fn mark_task_error(
    task: entity::task::Model,
    err_msg: String,
    elapsed: i32,
    retry_count: i32,
    now: DateTime<Utc>,
    conn: &DatabaseConnection,
) {
    let _ = conn
        .transaction(|txn| {
            Box::pin(async move {
                super::apply_task_result(
                    task.into_active_model(),
                    entity::task::Status::Error,
                    Some(err_msg),
                    Some(elapsed),
                    Some(retry_count),
                    now,
                    txn,
                )
                .await
            })
        })
        .await;
}

async fn execute_single_task(
    task: entity::task::Model,
    conn: &DatabaseConnection,
) -> Result<(), anyhow::Error> {
    let now = Utc::now();
    let retry_count = task.retry_count.unwrap_or(0) + 1;
    let task_clone = task.clone();
    let start = std::time::Instant::now();

    let result = tokio::time::timeout(TASK_TIMEOUT, async {
        conn.transaction(|txn| {
            Box::pin(async move {
                super::apply_task_result(
                    task_clone.clone().into_active_model(),
                    entity::task::Status::Running,
                    None,
                    None,
                    Some(retry_count),
                    now,
                    txn,
                )
                .await?;

                let work_result = match task_clone.r#type {
                    Some(ref t) if t.is_download() => execute_download_task_and_create_merge_task(
                        txn,
                        ExecuteDownloadTaskAndCreateMergeTaskParam {
                            download_task_id: task_clone.id.clone(),
                            now,
                        },
                    )
                    .await
                    .map(|_| ()),
                    Some(ref t) if t.is_merge() => execute_merge_task(
                        txn,
                        ExecuteMergeTaskParam {
                            merge_task_id: task_clone.id.clone(),
                            now,
                        },
                    )
                    .await
                    .map(|_| ()),
                    _ => Err(TaskError::Internal(anyhow::anyhow!(
                        "unsupported task type"
                    ))),
                };

                let elapsed = start.elapsed().as_millis() as i32;
                let task = entity::task::Entity::find_by_id(task_clone.id.clone())
                    .one(txn)
                    .await?
                    .ok_or_else(|| anyhow::anyhow!("task not found id = {}", task_clone.id))?;
                let task_active = task.into_active_model();

                match work_result {
                    Ok(_) => {
                        super::apply_task_result(
                            task_active,
                            entity::task::Status::Finished,
                            None,
                            Some(elapsed),
                            None,
                            now,
                            txn,
                        )
                        .await?;
                    }
                    Err(TaskError::FinishedButError(reason)) => {
                        super::apply_task_result(
                            task_active,
                            entity::task::Status::FinishedButError,
                            Some(reason),
                            Some(elapsed),
                            None,
                            now,
                            txn,
                        )
                        .await?;
                    }
                    Err(e) => return Err(anyhow::anyhow!("{:?}", e)),
                }

                Ok::<(), anyhow::Error>(())
            })
        })
        .await
    })
    .await;

    let elapsed = start.elapsed().as_millis() as i32;

    match result {
        Ok(Ok(())) => {}
        Ok(Err(transaction_err)) => {
            let err_msg = match &transaction_err {
                sea_orm::TransactionError::Connection(db_err) => db_err.to_string(),
                sea_orm::TransactionError::Transaction(inner_err) => format!("{:?}", inner_err),
            };
            tracing::warn!("task execution error id={}: {}", task.id, err_msg);
            mark_task_error(task, err_msg, elapsed, retry_count, now, conn).await;
        }
        Err(_) => {
            let err_msg = format!("task timed out after {:?}", TASK_TIMEOUT);
            tracing::warn!("task execution timeout id={}: {}", task.id, err_msg);
            mark_task_error(task, err_msg, elapsed, retry_count, now, conn).await;
        }
    }

    Ok(())
}

async fn execute_task_batch(
    tasks: Vec<entity::task::Model>,
    conn: &DatabaseConnection,
) -> Result<(), anyhow::Error> {
    let semaphore = Arc::new(Semaphore::new(MAX_TASK_CONCURRENCY));
    let mut handles = Vec::with_capacity(tasks.len());

    for task in tasks {
        let permit = semaphore.clone().acquire_owned().await;
        let conn = conn.clone();
        handles.push(tokio::spawn(async move {
            let _permit = permit;
            execute_single_task(task, &conn).await
        }));
    }

    for handle in handles {
        if let Err(e) = handle.await {
            tracing::error!("task panicked: {:?}", e);
        }
    }

    Ok(())
}

pub async fn run_tasks(conn: &DatabaseConnection) -> Result<(), anyhow::Error> {
    let tasks = query_pending_tasks(conn).await?;
    if tasks.is_empty() {
        return Ok(());
    }
    tracing::info!("found {} pending tasks", tasks.len());
    execute_task_batch(tasks, conn).await
}

pub async fn drain_tasks(conn: &DatabaseConnection) -> Result<(), anyhow::Error> {
    loop {
        run_tasks(conn).await?;
        if query_pending_tasks(conn).await?.is_empty() {
            return Ok(());
        }
    }
}

async fn find_ready_file_ids(
    file_ids: Vec<String>,
    conn: &DatabaseConnection,
) -> Result<Vec<String>, anyhow::Error> {
    let merges = entity::task_data_merge::Entity::find()
        .filter(entity::task_data_merge::Column::DataId.is_in(file_ids.clone()))
        .all(conn)
        .await?;

    let merge_ids: Vec<String> = merges.iter().map(|m| m.id.clone()).collect();

    let unfinished_file_ids = if merge_ids.is_empty() {
        vec![]
    } else {
        let tasks = entity::task::Entity::find()
            .filter(entity::task::Column::DataId.is_in(merge_ids))
            .filter(entity::task::Column::Status.ne(entity::task::Status::Finished))
            .all(conn)
            .await?;

        let unfinished_merge_ids: Vec<String> =
            tasks.iter().filter_map(|t| t.data_id.clone()).collect();

        if unfinished_merge_ids.is_empty() {
            vec![]
        } else {
            entity::task_data_merge::Entity::find()
                .filter(entity::task_data_merge::Column::Id.is_in(unfinished_merge_ids))
                .all(conn)
                .await?
                .into_iter()
                .filter_map(|m| m.data_id)
                .collect()
        }
    };

    Ok(file_ids
        .into_iter()
        .filter(|id| !unfinished_file_ids.contains(id))
        .collect())
}

async fn logically_delete_files(
    file_ids: &[String],
    conn: &DatabaseConnection,
) -> Result<(), anyhow::Error> {
    conn.transaction(|txn| {
        let ids = file_ids.to_vec();
        Box::pin(async move {
            for id in &ids {
                let file = entity::file::Entity::find_by_id(id.clone())
                    .one(txn)
                    .await?
                    .ok_or_else(|| anyhow::anyhow!("file not found: {}", id))?;
                let mut active: entity::file::ActiveModel = file.into();
                active.content = ActiveValue::Set(Some(vec![]));
                active.is_delete = ActiveValue::Set(Some(true));
                active.update(txn).await?;
            }
            tracing::info!("[SCHEDULE] logically deleted {} history files", ids.len());
            Ok::<_, anyhow::Error>(())
        })
    })
    .await
    .map_err(|e| anyhow::anyhow!("{:?}", e))
}

async fn schedule_clear_file(conn: &DatabaseConnection, max_size: i64) -> Result<(), anyhow::Error> {
    if max_size < 0 {
        return Ok(());
    }

    let total: i64 = entity::file::Entity::find()
        .filter(entity::file::Column::IsDelete.eq(Some(false)))
        .all(conn)
        .await?
        .iter()
        .map(|f| f.size.unwrap_or(0))
        .sum();

    if total <= max_size {
        tracing::info!(
            "[SCHEDULE] total file size {} <= max_size {}, skip",
            total,
            max_size
        );
        return Ok(());
    }

    const FILE_BATCH_SIZE: u64 = 64;

    let files = entity::file::Entity::find()
        .filter(entity::file::Column::IsDelete.eq(Some(false)))
        .order_by(entity::file::Column::UpdateDatetime, Order::Asc)
        .limit(FILE_BATCH_SIZE)
        .all(conn)
        .await?;

    if files.is_empty() {
        return Ok(());
    }

    let file_ids: Vec<String> = files.iter().map(|f| f.id.clone()).collect();

    let ready_ids = find_ready_file_ids(file_ids, conn).await?;

    if ready_ids.is_empty() {
        tracing::info!("[SCHEDULE] no ready files to delete in this batch");
        return Ok(());
    }

    logically_delete_files(&ready_ids, conn).await
}

pub async fn run_scheduled_tasks(conn: &DatabaseConnection, max_size: i64) -> Result<(), anyhow::Error> {
    tracing::info!("[TASK] [SCHEDULE] run_scheduled_tasks");
    schedule_clear_file(conn, max_size).await
}
