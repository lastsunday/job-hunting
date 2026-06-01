use std::collections::HashMap;
use std::{fs, path::Path};

use base64::Engine;
use chrono::{DateTime, Utc};
use git2::{Cred, FileMode, RemoteCallbacks, Signature, Time, build::TreeUpdateBuilder};
use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter};
use service::task::{
    CalculateAndCreateDownloadTaskParam, CreatePlanParam,
    ExecuteDownloadTaskAndCreateMergeTaskParam, ExecuteMergeTaskParam, RepoType,
    TaskPlanConfigDataDownloadConfig, TaskType, Type, calculate_and_create_download_task,
    create_plan, execute_download_task_and_create_merge_task, execute_merge_task,
    get_file_name_by_task_type,
};
use testcontainers::ContainerAsync;
use testcontainers_modules::gitea::Gitea;
use uuid::Uuid;

use crate::common::{
    ADMIN_PASSWORD, ADMIN_USERNAME, DATA_REPO, setup_database, setup_git_server, tear_down,
    tear_down_git_server,
};

mod common;

#[tokio::test]
async fn test_full_flow() {
    let (gitea, repo_url, token) = setup_gitea_with_test_data().await;
    let (container, state) = setup_database().await;

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

    let (task_data_plan_id, task_plan_id) = create_plan(
        &state.conn,
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
        if id == task_plan_id.clone() && r#type == Some(entity::task_plan::Type::DataDownload)
        && enable == Some(true)&& cron_actual == Some(cron.to_string())
    ));
    let entity::task_plan::Model { config, .. } = task_plan.unwrap();
    let config: TaskPlanConfigDataDownloadConfig =
        serde_json::from_str(config.unwrap().as_str()).unwrap();
    assert!(
        matches!(config.clone(), TaskPlanConfigDataDownloadConfig { task_type_list:task_type_list_actual, url, user_name:user_name_actual, repo_name:repo_name_actual,.. }
        if task_type_list_actual.len() == 1 && url == Some(repo_url.clone())
        && user_name_actual == Some(user_name.to_string()) && repo_name_actual == Some(repo_name.to_string())
        )
    );

    // NOTE: 2. 计算和创建下载任务
    let plan_id = task_plan_id.clone();
    let file_name = get_file_name_by_task_type(&TaskType::JobDataDownload);
    // TODO: key for git auth not static,need to query other table
    let TaskPlanConfigDataDownloadConfig { url, token, .. } = config.clone();
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

    // NOTE: 3. 执行下载任务和创建合并任务
    let download_task_id = task_ids.first().unwrap().to_string();
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

    // NOTE: 4. 执行合并任务
    let now: DateTime<Utc> = "2024-01-03T00:00:00Z".parse::<DateTime<Utc>>().unwrap();
    let data_count = execute_merge_task(
        &state.conn,
        ExecuteMergeTaskParam {
            merge_task_id: merge_task_id.to_string(),
            now,
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

    // checking job record
    let count = entity::job::Entity::find()
        .count(&state.conn)
        .await
        .unwrap();
    assert!(count > 0);

    // TODO: checking uri

    state.conn.close().await.unwrap();
    tear_down(&container).await;
    tear_down_git_server(Some(gitea)).await;
}

async fn setup_gitea_with_test_data() -> (ContainerAsync<Gitea>, String, String) {
    let (gitea, _, http_port, _, _) = setup_git_server().await;
    let repo_url = format!("http://localhost:{http_port}/{ADMIN_USERNAME}/{DATA_REPO}.git");

    let creds = base64::engine::general_purpose::STANDARD
        .encode(format!("{ADMIN_USERNAME}:{ADMIN_PASSWORD}"));
    let client = reqwest::Client::new();
    let token_resp = client
        .post(format!(
            "http://localhost:{http_port}/api/v1/users/{ADMIN_USERNAME}/tokens"
        ))
        .header("Authorization", format!("Basic {creds}"))
        .header("Content-Type", "application/json")
        .body(
            serde_json::json!({"name": "test-token", "scopes": ["read:repository", "write:repository"]})
                .to_string(),
        )
        .send()
        .await
        .unwrap_or_else(|e| panic!("failed to create token: {e}"));
    let token_body: serde_json::Value = token_resp
        .json()
        .await
        .unwrap_or_else(|e| panic!("failed to parse token response: {e}"));
    let token = token_body["sha1"]
        .as_str()
        .unwrap_or_else(|| panic!("token response missing 'sha1': {token_body}"))
        .to_string();

    let path_string = gen_unique_random_path();
    let local_path = Path::new(&path_string);
    let repo = service::util::git::git_clone_by_http(
        &repo_url,
        local_path,
        ADMIN_USERNAME,
        ADMIN_PASSWORD,
    )
    .unwrap_or_else(|e| {
        fs::remove_dir_all(local_path).unwrap();
        panic!("failed to clone: {}", e)
    });

    let resources_data_path = Path::new("tests").join("resources").join("data");
    let test_data_file_map = create_test_file_map();
    let head = repo.head().unwrap();
    let head_commit_id = repo.refname_to_id(head.name().unwrap()).unwrap();
    let head_commit = repo.find_commit(head_commit_id).unwrap();
    let tree_id = head_commit.tree_id();
    let tree = repo.find_tree(tree_id).unwrap();
    let mut tree_update_builder = TreeUpdateBuilder::new();
    for key in test_data_file_map.keys() {
        let test_file_path = resources_data_path.join(test_data_file_map.get(key).unwrap());
        let test_file_data = fs::read(test_file_path.as_path()).unwrap();
        let file_blob_id = repo.blob(&test_file_data).unwrap();
        tree_update_builder.upsert(Path::new(key), file_blob_id, FileMode::Blob);
    }
    let update_tree_id = tree_update_builder.create_updated(&repo, &tree).unwrap();
    let update_tree = repo.find_tree(update_tree_id).unwrap();

    let now = Utc::now();
    let sig = Signature::new(
        ADMIN_USERNAME,
        "example@example.com",
        &Time::new(now.timestamp(), 0),
    )
    .unwrap();
    let head_id = repo.refname_to_id("HEAD").unwrap();
    let parent = repo.find_commit(head_id).unwrap();
    repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        "add test file",
        &update_tree,
        &[&parent],
    )
    .unwrap();
    let main_branch = repo.find_branch("main", git2::BranchType::Local).unwrap();
    let mut remote = repo.find_remote("origin").unwrap();
    let mut po = git2::PushOptions::new();
    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(|_, _, _| Cred::userpass_plaintext(ADMIN_USERNAME, ADMIN_PASSWORD));
    po.remote_callbacks(callbacks);
    remote
        .push::<&str>(
            &[main_branch.into_reference().name().unwrap()],
            Some(&mut po),
        )
        .unwrap();

    fs::remove_dir_all(local_path).unwrap();
    (gitea, repo_url, token)
}

fn create_test_file_map() -> HashMap<String, String> {
    let mut map = HashMap::new();
    map.insert("2024/01-01/job.zip".to_string(), "job-v0.zip".to_string());
    map.insert("2024/01-02/job.zip".to_string(), "job-v1.zip".to_string());
    map
}

fn gen_unique_random_path() -> String {
    let random_dir_name = Uuid::new_v4();
    format!(".{random_dir_name}")
}
