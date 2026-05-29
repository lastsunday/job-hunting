use chrono::{DateTime, Utc};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use service::task::{
    CalculateAndCreateDownloadTaskParam, CreatePlanParam,
    ExecuteDownloadTaskAndCreateMergeTaskParam, ExecuteMergeTaskParam, RepoType,
    TaskPlanConfigDataDownloadConfig, TaskType, Type, calculate_and_create_download_task,
    create_plan, execute_download_task_and_create_merge_task, execute_merge_task,
    get_file_name_by_task_type,
};

use crate::common::{setup_database, tear_down};

mod common;

#[tokio::test]
async fn test_full_flow() {
    // 测试策略：通过 Trait 抽象模拟 Git 网络拉取以快速测试逻辑，并配合 Testcontainers 启动真实容器验证数据库同步的可靠性。
    let (container, state) = setup_database().await;

    let now: DateTime<Utc> = "2024-01-03T00:00:00Z".parse::<DateTime<Utc>>().unwrap();
    // 创建task_plan
    let user_name = "lastsunday";
    let repo_name = "job-hunting-data";
    let repo_type = RepoType::Github;

    let task_type_list: Vec<TaskType> = vec![TaskType::JobDataDownload];
    let task_type = Type::DataDownload(TaskPlanConfigDataDownloadConfig {
        task_type_list,
        ..Default::default()
    });
    let task_enable = true;
    let cron = "0 */30 * * * * *";
    let key: Option<String> = None;

    let (task_data_plan_id, task_plan_id) = create_plan(
        &state.conn,
        CreatePlanParam {
            user_name: user_name.to_string(),
            repo_name: repo_name.to_string(),
            repo_type,
            task_type,
            task_enable,
            cron: cron.to_string(),
            key,
            now,
        },
    )
    .await
    .unwrap();
    // 检测生成的task plan
    assert!(!task_data_plan_id.is_empty());
    assert!(!task_plan_id.is_empty());

    let task_data_plan = entity::task_data_plan::Entity::find_by_id(task_data_plan_id.clone())
        .one(&state.conn)
        .await
        .unwrap();
    assert!(
        matches!(task_data_plan, Some(entity::task_data_plan::Model { id,plan_id, .. })
            if id == task_data_plan_id && plan_id == Some(task_plan_id.clone())
        )
    );

    let task_plan = entity::task_plan::Entity::find_by_id(task_plan_id.clone())
        .one(&state.conn)
        .await
        .unwrap();
    assert!(matches!(task_plan.clone(),
        Some(entity::task_plan::Model { id,r#type,enable,cron : cron_actual, .. })
        if id == task_plan_id && r#type == Some(entity::task_plan::Type::DataDownload)
        && enable == Some(true)&& cron_actual == Some(cron.to_string())
    ));
    let entity::task_plan::Model { config, .. } = task_plan.unwrap();
    let config: TaskPlanConfigDataDownloadConfig =
        serde_json::from_str(config.unwrap().as_str()).unwrap();
    assert!(
        matches!(config.clone(), TaskPlanConfigDataDownloadConfig { task_type_list:task_type_list_actual, url, user_name:user_name_actual, repo_name:repo_name_actual,.. }
        if task_type_list_actual.len() == 1 && url == Some(String::from("https://github.com/lastsunday/job-hunting-data"))
        && user_name_actual == Some(user_name.to_string()) && repo_name_actual == Some(repo_name.to_string())
        )
    );

    let plan_id = "dummy_plan_id";
    let file_name = get_file_name_by_task_type(&TaskType::JobDataDownload);
    // TODO: key not static,need to query other table
    let TaskPlanConfigDataDownloadConfig { url, key, .. } = config.clone();
    let retention_day = 365 * 10; //10 years
    let task_type = TaskType::JobDataDownload;

    let task_ids = calculate_and_create_download_task(
        &state.conn,
        CalculateAndCreateDownloadTaskParam {
            plan_id: plan_id.to_string(),
            user_name: user_name.to_string(),
            repo_name: repo_name.to_string(),
            task_type,
            now,
            file_name,
            url: url.unwrap().to_string(),
            key,
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
        .all(&state.conn)
        .await
        .unwrap();
    assert_eq!(2, task_list.len(), "database task list len not correct");
    let task_data_download_ids: Vec<&String> = task_list
        .iter()
        .filter_map(|t| t.data_id.as_ref())
        .collect();
    let task_data_download_list = entity::task_data_download::Entity::find()
        .filter(entity::task_data_download::Column::Id.is_in(task_data_download_ids))
        .all(&state.conn)
        .await
        .unwrap();
    assert_eq!(
        2,
        task_data_download_list.len(),
        "database task data download list len not correct"
    );

    let download_task_id = task_ids.first().unwrap().to_string();

    // 执行data download task并生成data merge task
    let now: DateTime<Utc> = "2024-01-03T00:00:00Z".parse::<DateTime<Utc>>().unwrap();

    let merge_task_ids = execute_download_task_and_create_merge_task(
        &state.conn,
        ExecuteDownloadTaskAndCreateMergeTaskParam {
            download_task_id: download_task_id.to_string(),
            now,
        },
    )
    .await
    .unwrap();
    // checking
    let entity::task::Model {
        status, data_id, ..
    } = entity::task::Entity::find_by_id(download_task_id)
        .one(&state.conn)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(status, Some(entity::task::Status::Finished));
    let entity::task_data_download::Model {
        data_id: download_file_id,
        ..
    } = entity::task_data_download::Entity::find_by_id(data_id.unwrap())
        .one(&state.conn)
        .await
        .unwrap()
        .unwrap();
    let entity::file::Model { content, .. } =
        entity::file::Entity::find_by_id(download_file_id.clone().unwrap())
            .one(&state.conn)
            .await
            .unwrap()
            .unwrap();
    assert!(!content.unwrap().is_empty());
    let (merge_task_id, _) = merge_task_ids.first().unwrap();
    let entity::task::Model {
        status: merge_task_status,
        data_id: merge_task_data_id,
        ..
    } = entity::task::Entity::find_by_id(merge_task_id.to_string())
        .one(&state.conn)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(merge_task_status, Some(entity::task::Status::Ready));
    let entity::task_data_merge::Model {
        data_id: merge_file_id,
        ..
    } = entity::task_data_merge::Entity::find_by_id(merge_task_data_id.unwrap())
        .one(&state.conn)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(download_file_id, merge_file_id);

    // 执行data merge task
    let data_count = execute_merge_task(
        &state.conn,
        ExecuteMergeTaskParam {
            merge_task_id: merge_task_id.to_string(),
        },
    )
    .await
    .unwrap();
    // checking
    assert!(data_count > 0);
    let entity::task::Model {
        status: merge_task_status,
        data_id: merge_task_data_id,
        ..
    } = entity::task::Entity::find_by_id(merge_task_id)
        .one(&state.conn)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(merge_task_status, Some(entity::task::Status::Finished));
    let entity::task_data_merge::Model {
        data_count: merge_task_data_count,
        ..
    } = entity::task_data_merge::Entity::find_by_id(merge_task_data_id.unwrap())
        .one(&state.conn)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(data_count, merge_task_data_count.unwrap());

    state.conn.close().await.unwrap();
    tear_down(&container).await;
}
