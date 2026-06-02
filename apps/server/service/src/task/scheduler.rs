use std::collections::HashMap;
use std::str::FromStr;
use std::sync::OnceLock;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use chrono::{DateTime, Utc};
use cron::Schedule;
use sea_orm::{
    ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel, QueryFilter, TransactionTrait,
};
use tokio::sync::watch;
use tokio::time;

use crate::task::{
    CalculateAndCreateDownloadTaskParam, Error as TaskError,
    ExecuteDownloadTaskAndCreateMergeTaskParam, ExecuteMergeTaskParam,
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

pub fn start_scheduler(conn: DatabaseConnection) {
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
        let mut interval = time::interval(Duration::from_secs(30));
        loop {
            tokio::select! {
                _ = interval.tick() => {
                    if let Err(e) = app_background_task_run(&conn).await {
                        tracing::error!("background task run error: {:?}", e);
                    }
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

pub async fn app_background_task_run(conn: &DatabaseConnection) -> Result<(), anyhow::Error> {
    let start = std::time::Instant::now();
    tracing::info!("background task run started");

    process_all_plans(conn).await?;
    run_tasks(conn).await?;
    run_scheduled_tasks(conn).await?;

    tracing::info!("background task run completed in {:?}", start.elapsed());
    Ok(())
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

async fn process_all_plans(conn: &DatabaseConnection) -> Result<(), anyhow::Error> {
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

pub async fn run_tasks(conn: &DatabaseConnection) -> Result<(), anyhow::Error> {
    let tasks = query_pending_tasks(conn).await?;

    if tasks.is_empty() {
        return Ok(());
    }

    tracing::info!("found {} pending tasks", tasks.len());

    for task in tasks {
        let now = Utc::now();
        let retry_count = task.retry_count.unwrap_or(0) + 1;
        let task_clone = task.clone();
        let start = std::time::Instant::now();

        let result = conn
            .transaction(|txn| {
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

                    let result = match task_clone.r#type {
                        Some(ref t)
                            if matches!(
                                t,
                                entity::task::Type::JobDataDownload
                                    | entity::task::Type::CompanyDataDownload
                            ) =>
                        {
                            execute_download_task_and_create_merge_task(
                                txn,
                                ExecuteDownloadTaskAndCreateMergeTaskParam {
                                    download_task_id: task_clone.id.clone(),
                                    now,
                                },
                            )
                            .await
                            .map(|_| ())
                        }
                        Some(ref t)
                            if matches!(
                                t,
                                entity::task::Type::JobDataMerge
                                    | entity::task::Type::CompanyDataMerge
                            ) =>
                        {
                            execute_merge_task(
                                txn,
                                ExecuteMergeTaskParam {
                                    merge_task_id: task_clone.id.clone(),
                                    now,
                                },
                            )
                            .await
                            .map(|_| ())
                        }
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

                    match result {
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
            .await;

        if let Err(e) = result {
            let elapsed = start.elapsed().as_millis() as i32;
            let err_msg = match &e {
                sea_orm::TransactionError::Connection(db_err) => db_err.to_string(),
                sea_orm::TransactionError::Transaction(inner_err) => format!("{:?}", inner_err),
            };
            super::apply_task_result(
                task.clone().into_active_model(),
                entity::task::Status::Error,
                Some(err_msg.clone()),
                Some(elapsed),
                Some(retry_count),
                now,
                conn,
            )
            .await
            .ok();
            tracing::warn!("task execution error id={}: {}", task.id, err_msg);
        }
    }

    Ok(())
}

async fn run_scheduled_tasks(_conn: &DatabaseConnection) -> Result<(), anyhow::Error> {
    // TODO: placeholder for cleanup tasks (like scheduleClearFile)
    Ok(())
}
