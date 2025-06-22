use chrono::Utc;
use git2::build::TreeUpdateBuilder;
use git2::{Cred, FileMode, RemoteCallbacks, Signature, Time};
use std::collections::HashMap;
use std::str;
use std::{fs, path::Path};
use testcontainers::ContainerAsync;
use testcontainers_modules::gitea::Gitea;
use uuid::Uuid;
mod common;
use common::{ADMIN_PASSWORD, ADMIN_USERNAME, DATA_REPO, setup_git_server, tear_down_git_server};
use service::util::git::{
    gen_openssh_key, git_clone_by_http, git_clone_by_ssh, ls_tree_to_path_list,
};

#[tokio::test]
async fn test_clone_by_ssh_repo_success() {
    let (gitea, ssh_port, _, private_key, public_key) = setup_git_server().await;
    let repo_url: &str =
        &format!("ssh://git@localhost:{ssh_port}/{ADMIN_USERNAME}/{DATA_REPO}.git");
    let path_string = gen_unique_random_path();
    let local_path = Path::new(&path_string);
    let _repo = match git_clone_by_ssh(repo_url, local_path, private_key, public_key) {
        Ok(repo) => repo,
        Err(e) => {
            tear_down_git_server(Some(gitea)).await;
            fs::remove_dir_all(local_path).unwrap();
            panic!("failed to clone: {}", e)
        }
    };
    tear_down_git_server(Some(gitea)).await;
    fs::remove_dir_all(local_path).unwrap();
}

#[tokio::test]
async fn test_clone_by_http_repo_success() {
    let (gitea, _, http_port, _, _) = setup_git_server().await;
    let repo_url: &str = &format!("http://localhost:{http_port}/{ADMIN_USERNAME}/{DATA_REPO}.git");
    let path_string = gen_unique_random_path();
    let local_path = Path::new(&path_string);
    let _repo = match git_clone_by_http(repo_url, local_path, ADMIN_USERNAME, ADMIN_PASSWORD) {
        Ok(repo) => repo,
        Err(e) => {
            tear_down_git_server(Some(gitea)).await;
            fs::remove_dir_all(local_path).unwrap();
            panic!("failed to clone: {}", e)
        }
    };
    tear_down_git_server(Some(gitea)).await;
    fs::remove_dir_all(local_path).unwrap();
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
async fn setup_git_server_and_test_repo() -> (ContainerAsync<Gitea>, String) {
    // setup gitea and clone repo
    let (gitea, _, http_port, _, _) = setup_git_server().await;
    let repo_url: &str = &format!("http://localhost:{http_port}/{ADMIN_USERNAME}/{DATA_REPO}.git");
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
    (gitea, repo_url.to_string())
}

#[tokio::test]
async fn test_clone_by_http_repo_and_ls_tree() {
    let (gitea, repo_url) = setup_git_server_and_test_repo().await;
    let path_string = gen_unique_random_path();
    let local_path = Path::new(&path_string);
    let repo = match git_clone_by_http(
        repo_url.as_str(),
        local_path,
        ADMIN_USERNAME,
        ADMIN_PASSWORD,
    ) {
        Ok(repo) => repo,
        Err(e) => {
            tear_down_git_server(Some(gitea)).await;
            fs::remove_dir_all(local_path).unwrap();
            panic!("failed to clone: {}", e)
        }
    };
    // get head tree and ls tree
    let commit = repo
        .find_commit(
            repo.refname_to_id(repo.head().unwrap().name().unwrap())
                .unwrap(),
        )
        .unwrap();
    let tree = commit.tree().unwrap();
    let list = ls_tree_to_path_list(&tree);
    let test_data_file_map = create_test_file_map();
    let mut expect_file_map = HashMap::new();
    expect_file_map.insert("README.md", "");
    for key in test_data_file_map.keys() {
        expect_file_map.insert(key, "");
    }
    assert_eq!(expect_file_map.len(), list.len());
    for item in list {
        assert!(expect_file_map.contains_key(item.as_str()));
    }
    tear_down_git_server(Some(gitea)).await;
    fs::remove_dir_all(local_path).unwrap();
}

#[tokio::test]
async fn test_gen_ed25519_openssh() {
    let (private_key, public_key) = gen_openssh_key();
    println!("ed25519 openssh private key : \n{}", private_key);
    println!("ed25519 openssh public key : \n{}", public_key);
}

fn gen_unique_random_path() -> String {
    let random_dir_name = Uuid::new_v4();
    let path_string = &format!(".{random_dir_name}");
    path_string.to_string()
}
