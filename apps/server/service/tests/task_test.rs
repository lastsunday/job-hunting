use anyhow::Context;
use chrono::{DateTime, Utc};
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel,
    PaginatorTrait, QueryFilter, TransactionTrait,
};
use service::task::{
    CalculateAndCreateDownloadTaskParam, CreatePlanParam,
    ExecuteDownloadTaskAndCreateMergeTaskParam, ExecuteMergeTaskParam, RepoType,
    TaskPlanConfigDataDownloadConfig, TaskType, Type, calculate_and_create_download_task,
    create_data_plan, download_task_file, execute_merge_task, get_file_name_by_task_type,
    save_download_task_results,
};

use crate::common::{
    ADMIN_USERNAME, DATA_REPO, setup_database, setup_gitea_with_test_data, tear_down,
    tear_down_git_server,
};

mod common;

async fn set_task_finished(conn: &DatabaseConnection, task_id: &str, now: DateTime<Utc>) {
    let mut active = entity::task::Entity::find_by_id(task_id.to_string())
        .one(conn)
        .await
        .unwrap()
        .unwrap()
        .into_active_model();
    active.status = ActiveValue::Set(Some(entity::task::Status::Finished));
    active.update_datetime = ActiveValue::Set(Some(now.fixed_offset()));
    active.update(conn).await.unwrap();
}

#[tokio::test]
async fn test_full_flow() {
    let (gitea, repo_url, token) = setup_gitea_with_test_data().await;
    let (container, conn) = setup_database().await;

    let now: DateTime<Utc> = "2024-01-03T00:00:00Z".parse::<DateTime<Utc>>().unwrap();
    let user_name = ADMIN_USERNAME;
    let repo_name = DATA_REPO;
    let repo_type = RepoType::Github;

    let task_type_list: Vec<TaskType> = vec![TaskType::JobDataDownload];
    let task_type = Type::DataDownload(TaskPlanConfigDataDownloadConfig {
        task_type_list,
        url: Some(repo_url.clone()),
        user_name: Some(user_name.to_string()),
        repo_name: Some(repo_name.to_string()),
        token: Some(token.clone()),
    });
    let task_enable = true;
    let cron = "0 */30 * * * * *";

    let (task_data_plan_id, task_plan_id) = create_data_plan(
        &conn,
        CreatePlanParam {
            user_name: user_name.to_string(),
            repo_name: repo_name.to_string(),
            repo_type,
            task_type,
            task_enable,
            cron: cron.to_string(),
            token: Some(token.clone()),
            now,
        },
    )
    .await
    .unwrap();
    // 检测生成的task plan
    assert!(!task_data_plan_id.is_empty());
    assert!(!task_plan_id.is_empty());

    let task_data_plan = entity::task_data_plan::Entity::find_by_id(task_data_plan_id.clone())
        .one(&conn)
        .await
        .unwrap();
    assert!(
        matches!(task_data_plan, Some(entity::task_data_plan::Model { id,plan_id, .. })
            if id == task_data_plan_id && plan_id == Some(task_plan_id.clone())
        )
    );

    let task_plan = entity::task_plan::Entity::find_by_id(task_plan_id.clone())
        .one(&conn)
        .await
        .unwrap();
    assert!(matches!(task_plan.clone(),
        Some(entity::task_plan::Model { id,r#type,enable,cron : cron_actual, .. })
        if id == task_plan_id.clone() && r#type == Some(entity::task_plan::Type::DataDownload)
        && enable == Some(true)&& cron_actual == Some(cron.to_string())
    ));
    let entity::task_plan::Model { config, .. } = task_plan.unwrap();
    let config: TaskPlanConfigDataDownloadConfig = serde_json::from_value(config.unwrap()).unwrap();
    assert!(
        matches!(config.clone(), TaskPlanConfigDataDownloadConfig { task_type_list:task_type_list_actual, url, user_name:user_name_actual, repo_name:repo_name_actual,.. }
        if task_type_list_actual.len() == 1 && url == Some(repo_url.clone())
        && user_name_actual == Some(user_name.to_string()) && repo_name_actual == Some(repo_name.to_string())
        )
    );

    // NOTE: 2. 计算和创建下载任务
    let plan_id = task_plan_id.clone();
    let file_name = get_file_name_by_task_type(&TaskType::JobDataDownload);
    let TaskPlanConfigDataDownloadConfig { url, token, .. } = config.clone();
    let retention_day = 365 * 10; //10 years
    let task_type = TaskType::JobDataDownload;

    let task_ids = calculate_and_create_download_task(
        &conn,
        CalculateAndCreateDownloadTaskParam {
            plan_id: plan_id.to_string(),
            user_name: user_name.to_string(),
            repo_name: repo_name.to_string(),
            task_type,
            now,
            file_name,
            url: url.unwrap().to_string(),
            token,
            retention_day,
        },
    )
    .await
    .unwrap();

    assert_eq!(2, task_ids.len(), "save task ids not correct");

    let task_ids = task_ids
        .iter()
        .map(|(task_id, _)| task_id)
        .collect::<Vec<_>>();

    let task_list = entity::task::Entity::find()
        .filter(entity::task::Column::Id.is_in(task_ids.clone()))
        .all(&conn)
        .await
        .unwrap();
    assert_eq!(2, task_list.len(), "database task list len not correct");
    let task_data_download_ids: Vec<&String> = task_list
        .iter()
        .filter_map(|t| t.data_id.as_ref())
        .collect();
    let task_data_download_list = entity::task_data_download::Entity::find()
        .filter(entity::task_data_download::Column::Id.is_in(task_data_download_ids))
        .all(&conn)
        .await
        .unwrap();
    assert_eq!(
        2,
        task_data_download_list.len(),
        "database task data download list len not correct"
    );

    // NOTE: 3. 执行下载任务和创建合并任务
    let download_task_id = task_ids.first().unwrap().to_string();
    let now: DateTime<Utc> = "2024-01-03T00:00:00Z".parse::<DateTime<Utc>>().unwrap();
    let download_result = download_task_file(
        &conn,
        ExecuteDownloadTaskAndCreateMergeTaskParam {
            download_task_id: download_task_id.clone(),
            now,
        },
    )
    .await
    .unwrap();
    let download_task_id_clone = download_task_id.clone();
    conn.transaction(|txn| {
        Box::pin(async move {
            save_download_task_results(txn, download_result, now).await?;
            let task = entity::task::Entity::find_by_id(download_task_id_clone)
                .one(txn)
                .await?
                .context("task not found")?;
            let mut active = task.into_active_model();
            active.status = ActiveValue::Set(Some(entity::task::Status::Finished));
            active.update_datetime = ActiveValue::Set(Some(now.fixed_offset()));
            active.update(txn).await?;
            Ok::<_, anyhow::Error>(())
        })
    })
    .await
    .unwrap();
    // checking
    let entity::task::Model {
        status, data_id, ..
    } = entity::task::Entity::find_by_id(download_task_id)
        .one(&conn)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(status, Some(entity::task::Status::Finished));
    let entity::task_data_download::Model {
        data_id: download_file_id,
        ..
    } = entity::task_data_download::Entity::find_by_id(data_id.unwrap())
        .one(&conn)
        .await
        .unwrap()
        .unwrap();
    let entity::file::Model { content, .. } =
        entity::file::Entity::find_by_id(download_file_id.clone().unwrap())
            .one(&conn)
            .await
            .unwrap()
            .unwrap();
    assert!(!content.unwrap().is_empty());
    let merge_tasks = entity::task::Entity::find()
        .filter(entity::task::Column::PlanId.eq(Some(plan_id.to_string())))
        .filter(entity::task::Column::Type.eq(Some(entity::task::Type::JobDataMerge)))
        .all(&conn)
        .await
        .unwrap();
    let (merge_task_id, merge_task_data_id) = {
        let mt = merge_tasks.first().unwrap();
        (mt.id.clone(), mt.data_id.clone().unwrap())
    };
    let entity::task::Model {
        status: merge_task_status,
        ..
    } = entity::task::Entity::find_by_id(merge_task_id.to_string())
        .one(&conn)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(merge_task_status, Some(entity::task::Status::Ready));
    let entity::task_data_merge::Model {
        data_id: merge_file_id,
        ..
    } = entity::task_data_merge::Entity::find_by_id(merge_task_data_id.to_string())
        .one(&conn)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(download_file_id, merge_file_id);

    // NOTE: 4. 执行合并任务
    let now: DateTime<Utc> = "2024-01-03T00:00:00Z".parse::<DateTime<Utc>>().unwrap();
    let data_count = execute_merge_task(
        &conn,
        ExecuteMergeTaskParam {
            merge_task_id: merge_task_id.to_string(),
            now,
        },
    )
    .await
    .unwrap();
    // checking
    assert!(data_count > 0);
    set_task_finished(&conn, &merge_task_id, now).await;
    let entity::task::Model {
        status: merge_task_status,
        data_id: merge_task_data_id,
        ..
    } = entity::task::Entity::find_by_id(merge_task_id)
        .one(&conn)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(merge_task_status, Some(entity::task::Status::Finished));
    let entity::task_data_merge::Model {
        data_count: merge_task_data_count,
        ..
    } = entity::task_data_merge::Entity::find_by_id(merge_task_data_id.unwrap())
        .one(&conn)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(data_count, merge_task_data_count.unwrap());

    // checking job record
    let count = entity::job::Entity::find().count(&conn).await.unwrap();
    assert!(count > 0);
    let job = entity::job::Entity::find()
        .one(&conn)
        .await
        .unwrap()
        .unwrap();

    let expect_uri =
        format!("data://{user_name}@localhost/{user_name}/{repo_name}/2024/01-01/job.zip");
    assert_eq!(job.uri, Some(expect_uri));

    conn.close().await.unwrap();
    tear_down(&container).await;
    tear_down_git_server(Some(gitea)).await;
}
