use chrono::Utc;
use git2::{Cred, RemoteCallbacks, Signature, Time};
use std::{fs, path::Path};
use testcontainers::ContainerAsync;
use testcontainers::runners::AsyncRunner;
use testcontainers_modules::gitea::{self, Gitea, GiteaRepo};
use uuid::Uuid;
mod common;
use common::{ADMIN_PASSWORD, ADMIN_USERNAME, DATA_REPO};
use gix_hash::ObjectId;
use service::util::git::{gen_openssh_key, git_clone_by_http};
use service::util::git_lite::{fetch_without_blobs, ls_refs};

#[tokio::test]
async fn test_ls_refs_public_repo() {
    let (gitea, repo_url) = setup().await;
    let refs = ls_refs(&repo_url, "refs/heads/").await.unwrap();
    assert!(
        refs.contains_key("refs/heads/main"),
        "Expected refs/heads/main, got: {:?}",
        refs
    );
    gitea.stop().await.unwrap();
}

#[tokio::test]
async fn test_fetch_without_blobs_public_repo() {
    let (gitea, repo_url) = setup().await;

    let refs = ls_refs(&repo_url, "refs/heads/").await.unwrap();
    let commit_hash = refs
        .get("refs/heads/main")
        .expect("should have refs/heads/main")
        .clone();

    let objects = fetch_without_blobs(&repo_url, &commit_hash).await.unwrap();

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

async fn setup() -> (ContainerAsync<Gitea>, String) {
    let (_, public_key) = gen_openssh_key();
    let gitea = Gitea::default()
        .with_admin_account(ADMIN_USERNAME, ADMIN_PASSWORD, Some(public_key))
        .with_repo(GiteaRepo::Public(DATA_REPO.to_owned()))
        .start()
        .await
        .unwrap();
    let http_port = gitea
        .get_host_port_ipv4(gitea::GITEA_HTTP_PORT)
        .await
        .unwrap();
    let repo_url = format!("http://localhost:{http_port}/{ADMIN_USERNAME}/{DATA_REPO}");

    let path_string = gen_unique_random_path();
    let local_path = Path::new(&path_string);
    let repo = git_clone_by_http(
        &format!("{}.git", repo_url),
        local_path,
        ADMIN_USERNAME,
        ADMIN_PASSWORD,
    )
    .expect("clone failed");

    if repo.head().is_err() {
        let sig = Signature::new(
            ADMIN_USERNAME,
            "test@test.com",
            &Time::new(Utc::now().timestamp(), 0),
        )
        .unwrap();
        let tree_id = repo.index().unwrap().write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "initial", &tree, &[])
            .unwrap();

        let mut remote = repo.find_remote("origin").unwrap();
        let mut po = git2::PushOptions::new();
        let mut callbacks = RemoteCallbacks::new();
        callbacks.credentials(|_, _, _| Cred::userpass_plaintext(ADMIN_USERNAME, ADMIN_PASSWORD));
        po.remote_callbacks(callbacks);
        remote
            .push(&["refs/heads/main:refs/heads/main"], Some(&mut po))
            .unwrap();
    }
    fs::remove_dir_all(local_path).unwrap();

    (gitea, repo_url)
}

fn gen_unique_random_path() -> String {
    let random_dir_name = Uuid::new_v4();
    format!(".{random_dir_name}")
}
