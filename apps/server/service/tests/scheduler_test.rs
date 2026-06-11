use chrono::Utc;
use sea_orm::{ActiveValue, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter};
use service::task::TaskPlanConfigDataDownloadConfig;
use service::task::scheduler;

mod common;

use crate::common::{
    ADMIN_USERNAME, DATA_REPO, setup_database, setup_gitea_with_test_data, tear_down,
    tear_down_git_server,
};

#[tokio::test]
async fn test_app_background_task_run_no_plans() {
    let (container, conn) = setup_database().await;

    scheduler::process_all_plans(&conn).await.unwrap();
    scheduler::drain_tasks(&conn).await.unwrap();
    scheduler::run_scheduled_tasks(&conn, Some(-1))
        .await
        .unwrap();

    conn.close().await.unwrap();
    tear_down(&container).await;
}

#[tokio::test]
async fn test_app_background_task_run_with_plan() {
    let (container, conn) = setup_database().await;
    let now = Utc::now();

    let config = TaskPlanConfigDataDownloadConfig::default();
    let config_json = serde_json::to_value(&config).unwrap();

    let task_plan_id = xid::new().to_string();
    let plan = entity::task_plan::ActiveModel {
        id: ActiveValue::Set(task_plan_id.clone()),
        r#type: ActiveValue::Set(Some(entity::task_plan::Type::DataDownload)),
        enable: ActiveValue::Set(Some(true)),
        config: ActiveValue::Set(Some(config_json)),
        cron: ActiveValue::Set(Some("0 */30 * * * * *".to_string())),
        create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
        update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
    };
    entity::task_plan::Entity::insert(plan)
        .exec(&conn)
        .await
        .unwrap();

    let task_data_plan_id = xid::new().to_string();
    let data_plan = entity::task_data_plan::ActiveModel {
        id: ActiveValue::Set(task_data_plan_id.clone()),
        plan_id: ActiveValue::Set(Some(task_plan_id.clone())),
        user_name: ActiveValue::Set(Some("test-user".to_string())),
        repo_name: ActiveValue::Set(Some("test-repo".to_string())),
        repo_type: ActiveValue::Set(Some("GITHUB".to_string())),
        create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
        update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
    };
    entity::task_data_plan::Entity::insert(data_plan)
        .exec(&conn)
        .await
        .unwrap();

    scheduler::process_all_plans(&conn).await.unwrap();
    scheduler::drain_tasks(&conn).await.unwrap();
    scheduler::run_scheduled_tasks(&conn, Some(-1))
        .await
        .unwrap();

    conn.close().await.unwrap();
    tear_down(&container).await;
}

#[tokio::test]
async fn test_run_tasks_no_tasks() {
    let (container, conn) = setup_database().await;

    scheduler::run_tasks(&conn).await.unwrap();

    conn.close().await.unwrap();
    tear_down(&container).await;
}

#[tokio::test]
async fn test_run_tasks_download_task_missing_plan() {
    let (container, conn) = setup_database().await;
    let now = Utc::now();

    let task = entity::task::ActiveModel {
        id: ActiveValue::Set(xid::new().to_string()),
        plan_id: ActiveValue::Set(Some("non-existent-plan".to_string())),
        r#type: ActiveValue::Set(Some(entity::task::Type::JobDataDownload)),
        data_id: ActiveValue::Set(None),
        status: ActiveValue::Set(Some(entity::task::Status::Ready)),
        error_reason: ActiveValue::Set(None),
        cost_time: ActiveValue::Set(Some(0)),
        retry_count: ActiveValue::Set(Some(0)),
        create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
        update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
    };
    entity::task::Entity::insert(task)
        .exec(&conn)
        .await
        .unwrap();

    scheduler::run_tasks(&conn).await.unwrap();

    let tasks = entity::task::Entity::find().all(&conn).await.unwrap();
    assert_eq!(tasks.len(), 1);
    assert_eq!(
        tasks[0].status,
        Some(entity::task::Status::Error),
        "download task should be set to Error when plan is missing"
    );
    assert!(
        tasks[0].error_reason.is_some(),
        "error_reason should be set"
    );
    assert!(
        tasks[0].retry_count.unwrap_or(0) >= 1,
        "retry_count should be incremented"
    );

    conn.close().await.unwrap();
    tear_down(&container).await;
}

#[tokio::test]
async fn test_run_tasks_merge_task_missing_file() {
    let (container, conn) = setup_database().await;
    let now = Utc::now();

    let task = entity::task::ActiveModel {
        id: ActiveValue::Set(xid::new().to_string()),
        plan_id: ActiveValue::Set(None),
        r#type: ActiveValue::Set(Some(entity::task::Type::JobDataMerge)),
        data_id: ActiveValue::Set(Some("non-existent-data".to_string())),
        status: ActiveValue::Set(Some(entity::task::Status::Ready)),
        error_reason: ActiveValue::Set(None),
        cost_time: ActiveValue::Set(Some(0)),
        retry_count: ActiveValue::Set(Some(0)),
        create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
        update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
    };
    entity::task::Entity::insert(task)
        .exec(&conn)
        .await
        .unwrap();

    scheduler::run_tasks(&conn).await.unwrap();

    let tasks = entity::task::Entity::find().all(&conn).await.unwrap();
    assert_eq!(tasks.len(), 1);
    assert_eq!(
        tasks[0].status,
        Some(entity::task::Status::Error),
        "merge task should be set to Error when file is missing"
    );
    assert!(
        tasks[0].retry_count.unwrap_or(0) >= 1,
        "retry_count should be incremented"
    );

    conn.close().await.unwrap();
    tear_down(&container).await;
}

#[tokio::test]
async fn test_run_tasks_exceeds_max_retry() {
    let (container, conn) = setup_database().await;
    let now = Utc::now();

    let task = entity::task::ActiveModel {
        id: ActiveValue::Set(xid::new().to_string()),
        plan_id: ActiveValue::Set(Some("exceeded-plan".to_string())),
        r#type: ActiveValue::Set(Some(entity::task::Type::CompanyDataDownload)),
        data_id: ActiveValue::Set(None),
        status: ActiveValue::Set(Some(entity::task::Status::Error)),
        error_reason: ActiveValue::Set(Some("previous error".to_string())),
        cost_time: ActiveValue::Set(Some(100)),
        retry_count: ActiveValue::Set(Some(2880)),
        create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
        update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
    };
    entity::task::Entity::insert(task)
        .exec(&conn)
        .await
        .unwrap();

    scheduler::run_tasks(&conn).await.unwrap();

    let tasks = entity::task::Entity::find().all(&conn).await.unwrap();
    assert_eq!(tasks.len(), 1);
    assert_eq!(
        tasks[0].status,
        Some(entity::task::Status::Error),
        "task exceeding max retry should not be picked up and status should remain Error"
    );
    assert_eq!(
        tasks[0].retry_count,
        Some(2880),
        "retry_count should remain unchanged"
    );

    conn.close().await.unwrap();
    tear_down(&container).await;
}

#[tokio::test]
async fn test_is_scheduler_running_default() {
    assert!(!scheduler::is_scheduler_running());
}

#[tokio::test]
async fn test_app_background_task_run_full_flow() {
    let (gitea, repo_url, token) = setup_gitea_with_test_data().await;
    let (container, conn) = setup_database().await;
    let now = Utc::now();

    let config = TaskPlanConfigDataDownloadConfig {
        task_type_list: vec![service::task::TaskType::JobDataDownload],
        url: Some(repo_url.clone()),
        user_name: Some(ADMIN_USERNAME.to_string()),
        repo_name: Some(DATA_REPO.to_string()),
        token: Some(token.clone()),
    };
    let config_json = serde_json::to_value(&config).unwrap();

    let task_plan_id = xid::new().to_string();
    let plan = entity::task_plan::ActiveModel {
        id: ActiveValue::Set(task_plan_id.clone()),
        r#type: ActiveValue::Set(Some(entity::task_plan::Type::DataDownload)),
        enable: ActiveValue::Set(Some(true)),
        config: ActiveValue::Set(Some(config_json)),
        cron: ActiveValue::Set(Some("0 */30 * * * * *".to_string())),
        create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
        update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
    };
    entity::task_plan::Entity::insert(plan)
        .exec(&conn)
        .await
        .unwrap();

    let data_plan = entity::task_data_plan::ActiveModel {
        id: ActiveValue::Set(xid::new().to_string()),
        plan_id: ActiveValue::Set(Some(task_plan_id.clone())),
        user_name: ActiveValue::Set(Some(ADMIN_USERNAME.to_string())),
        repo_name: ActiveValue::Set(Some(DATA_REPO.to_string())),
        repo_type: ActiveValue::Set(Some("GITHUB".to_string())),
        create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
        update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
    };
    entity::task_data_plan::Entity::insert(data_plan)
        .exec(&conn)
        .await
        .unwrap();

    // first run: calculate download tasks + execute them
    scheduler::process_all_plans(&conn).await.unwrap();
    scheduler::drain_tasks(&conn).await.unwrap();
    scheduler::run_scheduled_tasks(&conn, Some(-1))
        .await
        .unwrap();

    // verify download tasks finished, merge tasks created
    let all_tasks = entity::task::Entity::find()
        .filter(entity::task::Column::PlanId.eq(Some(task_plan_id.clone())))
        .all(&conn)
        .await
        .unwrap();
    assert!(!all_tasks.is_empty(), "should have created tasks");

    let download_tasks: Vec<_> = all_tasks
        .iter()
        .filter(|t| {
            matches!(
                t.r#type,
                Some(entity::task::Type::JobDataDownload | entity::task::Type::CompanyDataDownload,)
            )
        })
        .collect();
    assert_eq!(download_tasks.len(), 2, "should create 2 download tasks");
    for t in &download_tasks {
        assert_eq!(
            t.status,
            Some(entity::task::Status::Finished),
            "download task {} should be finished",
            t.id
        );
    }

    let merge_tasks: Vec<_> = all_tasks
        .iter()
        .filter(|t| {
            matches!(
                t.r#type,
                Some(entity::task::Type::JobDataMerge | entity::task::Type::CompanyDataMerge)
            )
        })
        .collect();
    assert!(!merge_tasks.is_empty(), "should create merge tasks");
    for t in &merge_tasks {
        assert_eq!(
            t.status,
            Some(entity::task::Status::Finished),
            "merge task {} should be finished after first run",
            t.id
        );
    }

    // data already imported (drain_tasks executes merge tasks in same run)
    let uri_1 = format!(
        "data://{}@localhost/{}/{}/2024/01-01/job.zip",
        ADMIN_USERNAME, ADMIN_USERNAME, DATA_REPO
    );
    let uri_2 = format!(
        "data://{}@localhost/{}/{}/2024/01-02/job.zip",
        ADMIN_USERNAME, ADMIN_USERNAME, DATA_REPO
    );

    let job_count = entity::job::Entity::find()
        .filter(entity::job::Column::Uri.eq(Some(uri_1)))
        .count(&conn)
        .await
        .unwrap();
    assert!(job_count > 0, "should have imported 2024-01-01 jobs");

    let job_count_v2 = entity::job::Entity::find()
        .filter(entity::job::Column::Uri.eq(Some(uri_2)))
        .count(&conn)
        .await
        .unwrap();
    assert!(job_count_v2 > 0, "should have imported 2024-01-02 jobs");

    // second run: no pending tasks, should be a no-op
    scheduler::process_all_plans(&conn).await.unwrap();
    scheduler::drain_tasks(&conn).await.unwrap();
    scheduler::run_scheduled_tasks(&conn, Some(-1))
        .await
        .unwrap();

    // verify merge tasks still finished
    let merge_tasks_after = entity::task::Entity::find()
        .filter(entity::task::Column::Type.is_in(vec![
            entity::task::Type::JobDataMerge,
            entity::task::Type::CompanyDataMerge,
        ]))
        .all(&conn)
        .await
        .unwrap();
    for t in &merge_tasks_after {
        assert_eq!(
            t.status,
            Some(entity::task::Status::Finished),
            "merge task {} should still be finished",
            t.id
        );
    }

    // data unchanged
    let total = job_count + job_count_v2;
    let job_count_after = entity::job::Entity::find().count(&conn).await.unwrap();
    assert_eq!(
        total, job_count_after,
        "job count should remain same after no-op run"
    );

    conn.close().await.unwrap();
    tear_down(&container).await;
    tear_down_git_server(Some(gitea)).await;
}
