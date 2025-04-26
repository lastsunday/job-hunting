use std::str;
use std::{fs, path::Path};
use uuid::Uuid;
mod common;
use common::{setup_git_server, tear_down_git_server, ADMIN_PASSWORD, ADMIN_USERNAME, DATA_REPO};
use server::service::data::{git_clone_by_http, git_clone_by_ssh};

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

fn gen_unique_random_path() -> String {
    let random_dir_name = Uuid::new_v4();
    let path_string = &format!(".{random_dir_name}");
    path_string.to_string()
}
