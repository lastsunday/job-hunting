use chrono::Utc;
use git2::{Signature, Time};
use std::collections::HashMap;
use std::str;
use std::{fs, path::Path};
use uuid::Uuid;
mod common;
use common::{setup_git_server, tear_down_git_server, ADMIN_PASSWORD, ADMIN_USERNAME, DATA_REPO};
use server::util::git::{
    gen_openssh_key, git_clone_by_http, git_clone_by_ssh, ls_tree_to_path_list,
};

#[tokio::test]
async fn test_clone_by_ssh_repo_success() {
    let (gitea, ssh_port, _, private_key, public_key) = setup_git_server().await;
    let repo_url: &str =
        &format!("ssh://git@localhost:{ssh_port}/{ADMIN_USERNAME}/{DATA_REPO}.git");
    let path_string = gen_unique_random_path();
    let local_path = Path::new(&path_string);
    let _repo = match git_clone_by_ssh(repo_url, &local_path, private_key, public_key) {
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
    let _repo = match git_clone_by_http(repo_url, &local_path, ADMIN_USERNAME, ADMIN_PASSWORD) {
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
async fn test_clone_by_http_repo_and_ls_tree() {
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
    // add file 2025/04-29/test.txt
    let test_dir_path = local_path.join("2025").join("04-29");
    let test_file_path = &test_dir_path.join("test.txt");
    fs::create_dir_all(test_dir_path).unwrap();
    fs::write(Path::new(test_file_path), b"Hello, world!").unwrap();
    repo.index()
        .unwrap()
        .add_path(test_file_path.strip_prefix(local_path).unwrap())
        .unwrap();
    let tree_id = repo.index().unwrap().write_tree().unwrap();
    let tree = repo.find_tree(tree_id).unwrap();
    let now = Utc::now();
    let sig = Signature::new(
        ADMIN_USERNAME,
        "example@example.com",
        &Time::new(now.timestamp(), 0),
    )
    .unwrap();
    let head_id = repo.refname_to_id("HEAD").unwrap();
    let parent = repo.find_commit(head_id).unwrap();
    repo.commit(Some("HEAD"), &sig, &sig, "add test file", &tree, &[&parent])
        .unwrap();
    // get head tree and ls tree
    let commit = repo
        .find_commit(repo.head().unwrap().target().take().unwrap())
        .unwrap();
    let tree = commit.tree().unwrap();
    let list = ls_tree_to_path_list(&tree);
    let mut map = HashMap::new();
    map.insert("README.md", "");
    map.insert("2025/04-29/test.txt", "");
    for item in list {
        assert!(map.contains_key(item.as_str()));
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
