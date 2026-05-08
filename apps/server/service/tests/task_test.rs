use sea_orm::EntityTrait;
use service::task::{RepoType, TaskPlanConfigDataDownloadConfig, TaskType, Type, create_plan};

use crate::common::{setup_database, tear_down};

mod common;

#[tokio::test]
async fn test_task_create_and_gen() {
    let (container, state) = setup_database().await;

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

    let (task_data_plan_id, task_plan_id) = create_plan(
        &state.conn,
        user_name,
        repo_name,
        repo_type,
        task_type,
        task_enable,
        cron,
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
        matches!(config, TaskPlanConfigDataDownloadConfig { task_type_list:task_type_list_actual, url, user_name:user_name_actual, repo_name:repo_name_actual }
        if task_type_list_actual.len() == 1 && url == Some(String::from("https://github.com/lastsunday/job-hunting-data"))
        && user_name_actual == Some(user_name.to_string()) && repo_name_actual == Some(repo_name.to_string())
        )
    );

    // 生成data download task
    // 执行data download task并生成data merge task
    // 执行data merge task
    let _ = state.conn.close().await.unwrap();
    tear_down(&container).await;
}
