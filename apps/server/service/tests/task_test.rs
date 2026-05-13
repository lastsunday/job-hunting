use chrono::{DateTime, Utc};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use service::task::{
    RepoType, TaskPlanConfigDataDownloadConfig, TaskType, Type, calculate_lack_date_max_seq_list,
    create_plan, filter_sort_fetch_date_info, get_file_name_by_task_type, query_date_list,
    query_repo_file_date_and_max_seq_map, save_data_download_task,
};

use crate::common::{setup_database, tear_down};

mod common;

#[tokio::test]
async fn test_task_create_and_gen() {
    // 测试策略：通过 Trait 抽象模拟 Git 网络拉取以快速测试逻辑，并配合 Testcontainers 启动真实容器验证数据库同步的可靠性。
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
    let key: Option<String> = None;

    let (task_data_plan_id, task_plan_id) = create_plan(
        &state.conn,
        user_name,
        repo_name,
        repo_type,
        task_type,
        task_enable,
        cron,
        key,
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
    let now: DateTime<Utc> = "2024-01-03T00:00:00Z".parse::<DateTime<Utc>>().unwrap();
    let file_name = get_file_name_by_task_type(TaskType::JobDataDownload);
    // TODO: key not static,need to query other table
    let TaskPlanConfigDataDownloadConfig { url, key, .. } = config.clone();
    let retention_day = 365 * 10; //10 years
    let task_type = TaskType::JobDataDownload;
    // 根据task_type,datetime,seq,url,user_name,repo_name,生成data download task
    // 1. 根据文件名,url,获得仓库所有文件的路径和maxSeq
    // TODO: 根据保留日期进行过滤，避免过多文件路径查询和返回
    let repo_file_date_and_max_seq_map = query_repo_file_date_and_max_seq_map(
        file_name.as_str(),
        url.as_ref().unwrap().as_str(),
        &key,
        &now,
        retention_day,
    )
    .await
    .unwrap();
    let (start_date, end_date, repo_asc_date_list) =
        filter_sort_fetch_date_info(&repo_file_date_and_max_seq_map).unwrap();
    // 2. 根据数据库查询，获得数据库区间时间范围的记录
    let db_date_list = query_date_list(
        &state.conn,
        user_name,
        repo_name,
        &task_type,
        &start_date,
        &end_date,
    )
    .await
    .unwrap();
    // 3. 根据仓库记录日期和数据库记录日期，计算缺失的日期
    let lack_date_max_seq_list = calculate_lack_date_max_seq_list(
        &repo_asc_date_list,
        &db_date_list,
        &repo_file_date_and_max_seq_map,
    )
    .unwrap();
    // 4. 根据缺失日期及对应maxSeq，user_name,repo_name,task_type,生成 data download task
    let task_ids = save_data_download_task(
        &state.conn,
        plan_id,
        &task_type,
        &lack_date_max_seq_list,
        url.unwrap().as_str(),
        user_name,
        repo_name,
    )
    .await
    .unwrap();
    assert_eq!(2, task_ids.len(), "save task ids not correct");

    let task_ids = task_ids
        .iter()
        .map(|(task_id, _)| task_id)
        .collect::<Vec<_>>();

    let task_list = entity::task::Entity::find()
        .filter(entity::task::Column::Id.is_in(task_ids))
        .all(&state.conn)
        .await
        .unwrap();
    assert_eq!(2, task_list.len(), "database task list len not correct");
    let task_data_download_ids = task_list
        .iter()
        .map(|t| &t.data_id)
        .collect::<Vec<_>>()
        .iter()
        .filter_map(|x| x.as_ref())
        .collect::<Vec<_>>();
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

    // 执行data download task并生成data merge task
    // 执行data merge task
    state.conn.close().await.unwrap();
    tear_down(&container).await;
}
