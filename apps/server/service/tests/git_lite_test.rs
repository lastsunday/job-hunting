use chrono::Utc;
use git2::build::TreeUpdateBuilder;
use git2::{Cred, FileMode, RemoteCallbacks, Signature, Time};
use std::collections::HashMap;
use std::{fs, path::Path};
use testcontainers::ContainerAsync;
use testcontainers_modules::gitea::Gitea;
use uuid::Uuid;
mod common;
use common::{ADMIN_PASSWORD, ADMIN_USERNAME, DATA_REPO};
use gix_hash::ObjectId;
use service::util::git::git_clone_by_http;
use service::util::git_lite::{fetch_without_blobs, ls_refs};

use crate::common::{setup_git_server, tear_down_git_server};
use base64::Engine;

#[tokio::test]
async fn test_ls_refs_public_repo() {
    let (gitea, repo_url, token) = setup().await;
    let refs = ls_refs(&repo_url, "refs/heads/", Some(&token))
        .await
        .unwrap();
    assert!(
        refs.contains_key("refs/heads/main"),
        "Expected refs/heads/main, got: {:?}",
        refs
    );
    gitea.stop().await.unwrap();
}

#[tokio::test]
async fn test_fetch_without_blobs_public_repo() {
    let (gitea, repo_url, token) = setup().await;

    let refs = ls_refs(&repo_url, "refs/heads/", Some(&token))
        .await
        .unwrap();
    let commit_hash = refs
        .get("refs/heads/main")
        .expect("should have refs/heads/main")
        .clone();

    let objects = fetch_without_blobs(&repo_url, &commit_hash, Some(&token))
        .await
        .unwrap();

    assert!(
        objects.len() >= 2,
        "expected at least commit + tree objects, got {}",
        objects.len()
    );

    let commit_oid = ObjectId::from_hex(commit_hash.as_bytes()).unwrap();
    let commit_data = objects
        .get(&commit_oid)
        .expect("commit object should be present");

    let commit_str = std::str::from_utf8(commit_data).unwrap();
    let tree_line = commit_str.lines().next().unwrap();
    assert!(
        tree_line.starts_with("tree "),
        "commit first line should be 'tree <hash>'"
    );
    let tree_hash = &tree_line[5..];
    let tree_oid = ObjectId::from_hex(tree_hash.as_bytes()).unwrap();
    assert!(
        objects.contains_key(&tree_oid),
        "tree object should be present"
    );

    let tree_data = &objects[&tree_oid];
    let mut pos = 0;
    while pos < tree_data.len() {
        let null_pos = tree_data[pos..]
            .iter()
            .position(|&b| b == 0)
            .expect("null byte in tree entry");
        let entry_str = std::str::from_utf8(&tree_data[pos..pos + null_pos]).unwrap();
        let (mode, _name) = entry_str.split_once(' ').unwrap();
        pos += null_pos + 1;
        let entry_oid = ObjectId::try_from(&tree_data[pos..pos + 20]).unwrap();
        pos += 20;
        if mode.starts_with("100") || mode == "120000" {
            assert!(
                !objects.contains_key(&entry_oid),
                "blob object {} should be filtered out by blob:none",
                entry_oid
            );
        }
    }

    gitea.stop().await.unwrap();
}

async fn setup() -> (ContainerAsync<Gitea>, String, String) {
    // setup gitea and clone repo
    let (gitea, _, http_port, _, _) = setup_git_server().await;
    let repo_url: &str = &format!("http://localhost:{http_port}/{ADMIN_USERNAME}/{DATA_REPO}.git");

    // create access token via Gitea API
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
    let repo = match git_clone_by_http(repo_url, local_path, ADMIN_USERNAME, ADMIN_PASSWORD) {
        Ok(repo) => repo,
        Err(e) => {
            tear_down_git_server(Some(gitea)).await;
            fs::remove_dir_all(local_path).unwrap();
            panic!("failed to clone: {}", e)
        }
    };
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
    (gitea, repo_url.to_string(), token)
}

fn create_test_file_map() -> HashMap<String, String> {
    let mut test_data_file_map = HashMap::new();
    test_data_file_map.insert("2024/10-10/job.zip".to_string(), "job-v0.zip".to_string());
    test_data_file_map.insert(
        "2024/10-10/company.zip".to_string(),
        "company-v0.zip".to_string(),
    );
    test_data_file_map.insert("2024/12-31/job.zip".to_string(), "job-v1.zip".to_string());
    test_data_file_map.insert(
        "2024/12-31/company.zip".to_string(),
        "company-v1.zip".to_string(),
    );
    test_data_file_map
}

fn gen_unique_random_path() -> String {
    let random_dir_name = Uuid::new_v4();
    format!(".{random_dir_name}")
}
