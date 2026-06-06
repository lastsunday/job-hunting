use chrono::{DateTime, FixedOffset, Utc};
use framework::database;
use migration::MigratorTrait;
use sea_orm::DatabaseConnection;
use testcontainers::ContainerAsync;
use testcontainers_modules::postgres::Postgres;

#[allow(dead_code)]
pub async fn setup_database() -> (Option<ContainerAsync<Postgres>>, DatabaseConnection) {
    // postgres
    // let container = postgres::Postgres::default().start().await.unwrap();
    // let host_port = container.get_host_port_ipv4(5432).await.unwrap();
    // let database_url = &format!("postgres://postgres:postgres@127.0.0.1:{host_port}/postgres");

    // sqlite
    let container = None;
    let database_url = &"sqlite::memory:";
    let conn: DatabaseConnection = database::establish_connection(database_url).await.unwrap();
    migration::Migrator::up(&conn, None).await.unwrap();
    (container, conn)
}

#[allow(dead_code)]
pub async fn tear_down(container: &Option<ContainerAsync<Postgres>>) {
    if container.is_some() {
        container.as_ref().unwrap().stop().await.unwrap();
    }
}

#[allow(dead_code)]
pub fn str_to_datetime(value: String) -> Option<DateTime<FixedOffset>> {
    DateTime::parse_from_rfc3339(&value).ok()
}

#[allow(dead_code)]
pub fn datetime_to_str(datetime: Option<DateTime<FixedOffset>>) -> String {
    match datetime {
        Some(item) => item.to_rfc3339(),
        None => "".to_owned(),
    }
}

use base64::Engine;
use git2::{Cred, FileMode, RemoteCallbacks, Signature, Time, build::TreeUpdateBuilder};
use service::{util::git::gen_openssh_key, util::git::git_clone_by_http};
use std::collections::HashMap;
use std::str;
use std::{fs, path::Path};
use testcontainers::runners::AsyncRunner;
use testcontainers_modules::gitea::{self, Gitea, GiteaRepo};
use uuid::Uuid;
#[allow(dead_code)]
pub const ADMIN_USERNAME: &str = "git-admin";
#[allow(dead_code)]
pub const ADMIN_PASSWORD: &str = "git-admin";
#[allow(dead_code)]
pub const DATA_REPO: &str = "job-hunting-data";

#[allow(dead_code)]
pub async fn setup_git_server() -> (ContainerAsync<Gitea>, u16, u16, String, String) {
    let (private_key, public_key) = gen_openssh_key();
    let gitea = Gitea::default()
        .with_admin_account(ADMIN_USERNAME, ADMIN_PASSWORD, Some(public_key.clone()))
        .with_repo(GiteaRepo::Private(DATA_REPO.to_owned()))
        .start()
        .await
        .unwrap();
    let ssh_port = gitea
        .get_host_port_ipv4(gitea::GITEA_SSH_PORT)
        .await
        .unwrap();
    let http_port = gitea
        .get_host_port_ipv4(gitea::GITEA_HTTP_PORT)
        .await
        .unwrap();
    (gitea, ssh_port, http_port, private_key, public_key)
}

#[allow(dead_code)]
pub async fn tear_down_git_server(container: Option<ContainerAsync<Gitea>>) {
    if let Some(container) = container {
        container.stop().await.unwrap();
    }
}

#[allow(dead_code)]
pub async fn setup_gitea_with_test_data() -> (ContainerAsync<Gitea>, String, String) {
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
    let repo = git_clone_by_http(&repo_url, local_path, ADMIN_USERNAME, ADMIN_PASSWORD)
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

#[allow(dead_code)]
pub fn create_test_file_map() -> HashMap<String, String> {
    let mut map = HashMap::new();
    map.insert("2024/01-01/job.zip".to_string(), "job-v0.zip".to_string());
    map.insert("2024/01-02/job.zip".to_string(), "job-v1.zip".to_string());
    map
}

#[allow(dead_code)]
pub fn gen_unique_random_path() -> String {
    let random_dir_name = Uuid::new_v4();
    format!(".{random_dir_name}")
}
