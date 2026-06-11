use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter,
};
use service::task::scheduler;

mod common;

/// max_size < 0 时跳过清理，文件保留
#[tokio::test]
async fn test_clear_file_max_size_negative() {
    let (container, conn) = common::setup_database().await;

    insert_file(&conn, "f1", 100, 1).await;
    insert_file(&conn, "f2", 200, 2).await;

    scheduler::run_scheduled_tasks(&conn, Some(-1))
        .await
        .unwrap();

    let count = entity::file::Entity::find()
        .filter(entity::file::Column::IsDelete.eq(Some(false)))
        .count(&conn)
        .await
        .unwrap();
    assert_eq!(count, 2);

    conn.close().await.unwrap();
    common::tear_down(&container).await;
}

/// total < max_size 时跳过清理，文件保留
#[tokio::test]
async fn test_clear_file_under_limit() {
    let (container, conn) = common::setup_database().await;

    insert_file(&conn, "f1", 100, 1).await;
    insert_file(&conn, "f2", 200, 2).await;

    scheduler::run_scheduled_tasks(&conn, Some(1000))
        .await
        .unwrap();

    let count = entity::file::Entity::find()
        .filter(entity::file::Column::IsDelete.eq(Some(false)))
        .count(&conn)
        .await
        .unwrap();
    assert_eq!(count, 2);

    conn.close().await.unwrap();
    common::tear_down(&container).await;
}

/// 数据库无文件时跳过
#[tokio::test]
async fn test_clear_file_no_files() {
    let (container, conn) = common::setup_database().await;

    scheduler::run_scheduled_tasks(&conn, Some(100))
        .await
        .unwrap();

    conn.close().await.unwrap();
    common::tear_down(&container).await;
}

/// 所有文件都有未完成的 merge task，没有文件可删
#[tokio::test]
async fn test_clear_file_no_ready() {
    let (container, conn) = common::setup_database().await;

    insert_file(&conn, "f1", 100, 1).await;
    insert_file(&conn, "f2", 200, 2).await;
    insert_file(&conn, "f3", 300, 3).await;

    insert_merge_with_task(&conn, "m1", "f1", entity::task::Status::Ready).await;
    insert_merge_with_task(&conn, "m2", "f2", entity::task::Status::Running).await;
    insert_merge_with_task(&conn, "m3", "f3", entity::task::Status::Error).await;

    scheduler::run_scheduled_tasks(&conn, Some(0))
        .await
        .unwrap();

    let count = entity::file::Entity::find()
        .filter(entity::file::Column::IsDelete.eq(Some(false)))
        .count(&conn)
        .await
        .unwrap();
    assert_eq!(count, 3);

    conn.close().await.unwrap();
    common::tear_down(&container).await;
}

/// 部分文件 merge 完成、部分未完成：只删 ready 的文件
#[tokio::test]
async fn test_clear_file_partial_ready() {
    let (container, conn) = common::setup_database().await;

    insert_file(&conn, "f1", 100, 1).await;
    insert_file(&conn, "f2", 200, 2).await;
    insert_file(&conn, "f3", 300, 3).await;

    insert_merge_with_task(&conn, "m1", "f1", entity::task::Status::Finished).await;
    insert_merge_with_task(&conn, "m2", "f2", entity::task::Status::Finished).await;
    insert_merge_with_task(&conn, "m3", "f3", entity::task::Status::Ready).await;

    scheduler::run_scheduled_tasks(&conn, Some(0))
        .await
        .unwrap();

    let deleted: Vec<String> = entity::file::Entity::find()
        .filter(entity::file::Column::IsDelete.eq(Some(true)))
        .all(&conn)
        .await
        .unwrap()
        .into_iter()
        .map(|f| f.id)
        .collect();
    assert_eq!(deleted.len(), 2);
    assert!(deleted.contains(&"f1".to_string()));
    assert!(deleted.contains(&"f2".to_string()));

    let remaining = entity::file::Entity::find()
        .filter(entity::file::Column::IsDelete.eq(Some(false)))
        .all(&conn)
        .await
        .unwrap();
    assert_eq!(remaining.len(), 1);
    assert_eq!(remaining[0].id, "f3");

    conn.close().await.unwrap();
    common::tear_down(&container).await;
}

/// 文件没有关联 merge 记录时视为 ready，可直接删除
#[tokio::test]
async fn test_clear_file_no_merge_record() {
    let (container, conn) = common::setup_database().await;

    insert_file(&conn, "f1", 100, 1).await;
    insert_file(&conn, "f2", 200, 2).await;

    scheduler::run_scheduled_tasks(&conn, Some(0))
        .await
        .unwrap();

    let deleted: Vec<String> = entity::file::Entity::find()
        .filter(entity::file::Column::IsDelete.eq(Some(true)))
        .all(&conn)
        .await
        .unwrap()
        .into_iter()
        .map(|f| f.id)
        .collect();
    assert_eq!(deleted.len(), 2);

    conn.close().await.unwrap();
    common::tear_down(&container).await;
}

/// FinishedButError 视为未完成，文件不可删
#[tokio::test]
async fn test_clear_file_finished_but_error_not_ready() {
    let (container, conn) = common::setup_database().await;

    insert_file(&conn, "f1", 100, 1).await;
    insert_file(&conn, "f2", 200, 2).await;

    insert_merge_with_task(&conn, "m1", "f1", entity::task::Status::FinishedButError).await;
    insert_merge_with_task(&conn, "m2", "f2", entity::task::Status::Finished).await;

    scheduler::run_scheduled_tasks(&conn, Some(0))
        .await
        .unwrap();

    let deleted: Vec<String> = entity::file::Entity::find()
        .filter(entity::file::Column::IsDelete.eq(Some(true)))
        .all(&conn)
        .await
        .unwrap()
        .into_iter()
        .map(|f| f.id)
        .collect();
    assert_eq!(deleted.len(), 1);
    assert_eq!(deleted[0], "f2");

    conn.close().await.unwrap();
    common::tear_down(&container).await;
}

/// 文件超过 batch size（64）时，每周期只删 64 个
#[tokio::test]
async fn test_clear_file_batch_limit() {
    let (container, conn) = common::setup_database().await;

    for i in 0..70 {
        let file_id = format!("f{}", i);
        insert_file(&conn, &file_id, 100, i as i64 + 1).await;
    }

    scheduler::run_scheduled_tasks(&conn, Some(0))
        .await
        .unwrap();

    let deleted_count = entity::file::Entity::find()
        .filter(entity::file::Column::IsDelete.eq(Some(true)))
        .count(&conn)
        .await
        .unwrap();
    assert_eq!(deleted_count, 64);

    let remaining_count = entity::file::Entity::find()
        .filter(entity::file::Column::IsDelete.eq(Some(false)))
        .count(&conn)
        .await
        .unwrap();
    assert_eq!(remaining_count, 6);

    conn.close().await.unwrap();
    common::tear_down(&container).await;
}

/// total == max_size 边界：total 不超过 limit，不触发清理
#[tokio::test]
async fn test_clear_file_total_equals_max_size() {
    let (container, conn) = common::setup_database().await;

    insert_file(&conn, "f1", 100, 1).await;
    insert_file(&conn, "f2", 200, 2).await;

    scheduler::run_scheduled_tasks(&conn, Some(300))
        .await
        .unwrap();

    let count = entity::file::Entity::find()
        .filter(entity::file::Column::IsDelete.eq(Some(false)))
        .count(&conn)
        .await
        .unwrap();
    assert_eq!(count, 2);

    conn.close().await.unwrap();
    common::tear_down(&container).await;
}

/// 文件 size = None 时视为 0，不影响 total 计算
#[tokio::test]
async fn test_clear_file_size_none() {
    let (container, conn) = common::setup_database().await;

    insert_file(&conn, "f1", 100, 1).await;
    insert_file_size_none(&conn, "f2", 2).await;

    scheduler::run_scheduled_tasks(&conn, Some(0))
        .await
        .unwrap();

    let deleted = entity::file::Entity::find()
        .filter(entity::file::Column::IsDelete.eq(Some(true)))
        .count(&conn)
        .await
        .unwrap();
    assert_eq!(deleted, 2);

    conn.close().await.unwrap();
    common::tear_down(&container).await;
}

/// 一个文件关联多个 merge 记录，其中一条未完成时不可删
#[tokio::test]
async fn test_clear_file_multiple_merges_mixed() {
    let (container, conn) = common::setup_database().await;

    insert_file(&conn, "f1", 100, 1).await;

    insert_merge_with_task(&conn, "m1", "f1", entity::task::Status::Finished).await;
    insert_merge_with_task(&conn, "m2", "f1", entity::task::Status::Ready).await;

    scheduler::run_scheduled_tasks(&conn, Some(0))
        .await
        .unwrap();

    let deleted = entity::file::Entity::find()
        .filter(entity::file::Column::IsDelete.eq(Some(true)))
        .count(&conn)
        .await
        .unwrap();
    assert_eq!(deleted, 0);

    conn.close().await.unwrap();
    common::tear_down(&container).await;
}

/// 一个文件关联多个 merge 记录，全部 Finished 时可删
#[tokio::test]
async fn test_clear_file_multiple_merges_all_finished() {
    let (container, conn) = common::setup_database().await;

    insert_file(&conn, "f1", 100, 1).await;

    insert_merge_with_task(&conn, "m1", "f1", entity::task::Status::Finished).await;
    insert_merge_with_task(&conn, "m2", "f1", entity::task::Status::Finished).await;

    scheduler::run_scheduled_tasks(&conn, Some(0))
        .await
        .unwrap();

    let deleted = entity::file::Entity::find()
        .filter(entity::file::Column::IsDelete.eq(Some(true)))
        .count(&conn)
        .await
        .unwrap();
    assert_eq!(deleted, 1);

    conn.close().await.unwrap();
    common::tear_down(&container).await;
}

/// 已删除的文件不计入 total、不被 batch 查询选中
#[tokio::test]
async fn test_clear_file_mixed_deleted_and_not() {
    let (container, conn) = common::setup_database().await;

    insert_file(&conn, "f1", 100, 1).await;
    insert_file(&conn, "f2", 200, 2).await;
    insert_file_deleted(&conn, "f3", 300, 3).await;

    scheduler::run_scheduled_tasks(&conn, Some(0))
        .await
        .unwrap();

    let deleted: Vec<String> = entity::file::Entity::find()
        .filter(entity::file::Column::IsDelete.eq(Some(true)))
        .all(&conn)
        .await
        .unwrap()
        .into_iter()
        .map(|f| f.id)
        .collect();
    assert_eq!(deleted.len(), 3);
    assert!(deleted.contains(&"f1".to_string()));
    assert!(deleted.contains(&"f2".to_string()));
    assert!(deleted.contains(&"f3".to_string()));

    conn.close().await.unwrap();
    common::tear_down(&container).await;
}

/// total > max_size 时触发清理，按 update_datetime 从旧到新删除文件
#[tokio::test]
async fn test_clear_file_exceeds_limit_oldest_first() {
    let (container, conn) = common::setup_database().await;

    insert_file(&conn, "f1", 100, 30).await;
    insert_file(&conn, "f2", 100, 20).await;
    insert_file(&conn, "f3", 100, 10).await;

    scheduler::run_scheduled_tasks(&conn, Some(150))
        .await
        .unwrap();

    let deleted = entity::file::Entity::find()
        .filter(entity::file::Column::IsDelete.eq(Some(true)))
        .count(&conn)
        .await
        .unwrap();
    assert_eq!(deleted, 3);

    conn.close().await.unwrap();
    common::tear_down(&container).await;
}

/// 文件只有 download 引用但无 merge 引用 → 不删
#[tokio::test]
async fn test_clear_file_with_download_only() {
    let (container, conn) = common::setup_database().await;

    insert_file(&conn, "f1", 100, 1).await;
    insert_download_with_task(&conn, "d1", "f1", entity::task::Status::Finished).await;

    scheduler::run_scheduled_tasks(&conn, Some(0))
        .await
        .unwrap();

    let deleted = entity::file::Entity::find()
        .filter(entity::file::Column::IsDelete.eq(Some(true)))
        .count(&conn)
        .await
        .unwrap();
    assert_eq!(deleted, 0);

    conn.close().await.unwrap();
    common::tear_down(&container).await;
}

/// 文件有 download 引用 + merge 未完成 → 不删
#[tokio::test]
async fn test_clear_file_with_download_and_unfinished_merge() {
    let (container, conn) = common::setup_database().await;

    insert_file(&conn, "f1", 100, 1).await;
    insert_download_with_task(&conn, "d1", "f1", entity::task::Status::Finished).await;
    insert_merge_with_task(&conn, "m1", "f1", entity::task::Status::Ready).await;

    scheduler::run_scheduled_tasks(&conn, Some(0))
        .await
        .unwrap();

    let deleted = entity::file::Entity::find()
        .filter(entity::file::Column::IsDelete.eq(Some(true)))
        .count(&conn)
        .await
        .unwrap();
    assert_eq!(deleted, 0);

    conn.close().await.unwrap();
    common::tear_down(&container).await;
}

/// 文件有 download 引用 + merge 已完成 → 可删
#[tokio::test]
async fn test_clear_file_with_download_and_finished_merge() {
    let (container, conn) = common::setup_database().await;

    insert_file(&conn, "f1", 100, 1).await;
    insert_download_with_task(&conn, "d1", "f1", entity::task::Status::Finished).await;
    insert_merge_with_task(&conn, "m1", "f1", entity::task::Status::Finished).await;

    scheduler::run_scheduled_tasks(&conn, Some(0))
        .await
        .unwrap();

    let deleted = entity::file::Entity::find()
        .filter(entity::file::Column::IsDelete.eq(Some(true)))
        .count(&conn)
        .await
        .unwrap();
    assert_eq!(deleted, 1);

    conn.close().await.unwrap();
    common::tear_down(&container).await;
}

/// 文件有 download 引用 + 多个 merge 全部完成 → 可删
#[tokio::test]
async fn test_clear_file_with_download_and_all_merges_finished() {
    let (container, conn) = common::setup_database().await;

    insert_file(&conn, "f1", 100, 1).await;
    insert_download_with_task(&conn, "d1", "f1", entity::task::Status::Finished).await;
    insert_merge_with_task(&conn, "m1", "f1", entity::task::Status::Finished).await;
    insert_merge_with_task(&conn, "m2", "f1", entity::task::Status::Finished).await;

    scheduler::run_scheduled_tasks(&conn, Some(0))
        .await
        .unwrap();

    let deleted = entity::file::Entity::find()
        .filter(entity::file::Column::IsDelete.eq(Some(true)))
        .count(&conn)
        .await
        .unwrap();
    assert_eq!(deleted, 1);

    conn.close().await.unwrap();
    common::tear_down(&container).await;
}

async fn insert_file(
    conn: &sea_orm::DatabaseConnection,
    id: &str,
    size: i64,
    update_days_ago: i64,
) {
    let now = Utc::now() - chrono::Duration::days(update_days_ago);
    let file = entity::file::ActiveModel {
        id: ActiveValue::Set(id.to_string()),
        name: ActiveValue::Set(Some(format!("{}.zip", id))),
        sha: ActiveValue::NotSet,
        content: ActiveValue::Set(Some(vec![0u8; size as usize])),
        size: ActiveValue::Set(Some(size)),
        is_delete: ActiveValue::Set(Some(false)),
        create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
        update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
    };
    file.insert(conn).await.unwrap();
}

async fn insert_file_size_none(conn: &sea_orm::DatabaseConnection, id: &str, update_days_ago: i64) {
    let now = Utc::now() - chrono::Duration::days(update_days_ago);
    let file = entity::file::ActiveModel {
        id: ActiveValue::Set(id.to_string()),
        name: ActiveValue::Set(Some(format!("{}.zip", id))),
        sha: ActiveValue::NotSet,
        content: ActiveValue::Set(Some(vec![])),
        size: ActiveValue::NotSet,
        is_delete: ActiveValue::Set(Some(false)),
        create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
        update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
    };
    file.insert(conn).await.unwrap();
}

async fn insert_file_deleted(
    conn: &sea_orm::DatabaseConnection,
    id: &str,
    size: i64,
    update_days_ago: i64,
) {
    let now = Utc::now() - chrono::Duration::days(update_days_ago);
    let file = entity::file::ActiveModel {
        id: ActiveValue::Set(id.to_string()),
        name: ActiveValue::Set(Some(format!("{}.zip", id))),
        sha: ActiveValue::NotSet,
        content: ActiveValue::Set(Some(vec![])),
        size: ActiveValue::Set(Some(size)),
        is_delete: ActiveValue::Set(Some(true)),
        create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
        update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
    };
    file.insert(conn).await.unwrap();
}

async fn insert_merge_with_task(
    conn: &sea_orm::DatabaseConnection,
    merge_id: &str,
    file_id: &str,
    task_status: entity::task::Status,
) {
    let now = Utc::now();
    let merge = entity::task_data_merge::ActiveModel {
        id: ActiveValue::Set(merge_id.to_string()),
        r#type: ActiveValue::Set(Some(entity::task_data_merge::Type::JobDataMerge)),
        user_name: ActiveValue::Set(Some("test".to_string())),
        repo_name: ActiveValue::Set(Some("test-repo".to_string())),
        datetime: ActiveValue::Set(Some(now.fixed_offset())),
        data_id: ActiveValue::Set(Some(file_id.to_string())),
        data_count: ActiveValue::Set(Some(10)),
        config: ActiveValue::Set(Some(serde_json::json!({}))),
        data_page_num: ActiveValue::Set(Some(1)),
        data_page_size: ActiveValue::Set(Some(10)),
        create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
        update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
    };
    merge.insert(conn).await.unwrap();

    let task = entity::task::ActiveModel {
        id: ActiveValue::Set(xid::new().to_string()),
        plan_id: ActiveValue::NotSet,
        r#type: ActiveValue::Set(Some(entity::task::Type::JobDataMerge)),
        data_id: ActiveValue::Set(Some(merge_id.to_string())),
        status: ActiveValue::Set(Some(task_status)),
        error_reason: ActiveValue::NotSet,
        cost_time: ActiveValue::Set(Some(0)),
        retry_count: ActiveValue::Set(Some(0)),
        create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
        update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
    };
    task.insert(conn).await.unwrap();
}

async fn insert_download_with_task(
    conn: &sea_orm::DatabaseConnection,
    download_id: &str,
    file_id: &str,
    task_status: entity::task::Status,
) {
    let now = Utc::now();
    let download = entity::task_data_download::ActiveModel {
        id: ActiveValue::Set(download_id.to_string()),
        r#type: ActiveValue::Set(Some(entity::task_data_download::Type::JobDataDownload)),
        user_name: ActiveValue::Set(Some("test".to_string())),
        repo_name: ActiveValue::Set(Some("test-repo".to_string())),
        datetime: ActiveValue::Set(Some(now.fixed_offset())),
        config: ActiveValue::Set(Some(serde_json::json!({}))),
        data_id: ActiveValue::Set(Some(file_id.to_string())),
        seq: ActiveValue::Set(Some(1)),
        create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
        update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
    };
    download.insert(conn).await.unwrap();

    let task = entity::task::ActiveModel {
        id: ActiveValue::Set(xid::new().to_string()),
        plan_id: ActiveValue::NotSet,
        r#type: ActiveValue::Set(Some(entity::task::Type::JobDataDownload)),
        data_id: ActiveValue::Set(Some(download_id.to_string())),
        status: ActiveValue::Set(Some(task_status)),
        error_reason: ActiveValue::NotSet,
        cost_time: ActiveValue::Set(Some(0)),
        retry_count: ActiveValue::Set(Some(0)),
        create_datetime: ActiveValue::Set(Some(now.fixed_offset())),
        update_datetime: ActiveValue::Set(Some(now.fixed_offset())),
    };
    task.insert(conn).await.unwrap();
}
