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
use service::util::git_lite::{
    fetch_objects, fetch_without_blobs, ls_refs, ls_tree, resolve_paths, sparse_checkout,
};

use crate::common::{setup_git_server, tear_down_git_server};
use base64::Engine;

/// Verify that `ls_refs` can list remote refs via Git protocol v2.
#[tokio::test]
async fn test_ls_refs() {
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

/// Verify that `fetch_without_blobs` with `blob:none` filter fetches commit
/// and tree objects but excludes all blob objects from the packfile.
#[tokio::test]
async fn test_fetch_without_blobs() {
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

    let commit = gix_object::CommitRef::from_bytes(commit_data, gix_hash::Kind::Sha1)
        .expect("valid commit object");
    let tree_oid = commit.tree();
    assert!(
        objects.contains_key(&tree_oid),
        "tree object should be present"
    );

    let tree_data = &objects[&tree_oid];
    let tree = gix_object::TreeRef::from_bytes(tree_data, gix_hash::Kind::Sha1)
        .expect("valid tree object");

    for entry in &tree.entries {
        if entry.mode.is_blob_or_symlink() {
            assert!(
                !objects.contains_key(entry.oid),
                "blob object {} should be filtered out by blob:none",
                entry.oid
            );
        }
    }

    gitea.stop().await.unwrap();
}

/// Verify that `resolve_paths` walks tree objects and produces a correct
/// path → OID map from fetched commit+tree objects.
#[tokio::test]
async fn test_resolve_paths() {
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

    let path_map = resolve_paths(&objects, &commit_hash).unwrap();

    let expected_paths = [
        "README.md",
        "2024/10-10/job.zip",
        "2024/10-10/company.zip",
        "2024/12-31/job.zip",
        "2024/12-31/company.zip",
    ];
    for path in &expected_paths {
        assert!(
            path_map.contains_key(*path),
            "expected path '{}' in resolve_paths result, keys: {:?}",
            path,
            path_map.keys()
        );
    }

    gitea.stop().await.unwrap();
}

/// Verify that `ls_tree` fetches commit+tree objects and resolves paths
/// to a flat map of path → blob OID, excluding blob content.
#[tokio::test]
async fn test_ls_tree() {
    let (gitea, repo_url, token) = setup().await;

    let path_map = ls_tree(&repo_url, "refs/heads/main", Some(&token))
        .await
        .unwrap();

    let expected_paths = [
        "README.md",
        "2024/10-10/job.zip",
        "2024/10-10/company.zip",
        "2024/12-31/job.zip",
        "2024/12-31/company.zip",
    ];
    for path in &expected_paths {
        assert!(
            path_map.contains_key(*path),
            "expected path '{}' in ls_tree result, keys: {:?}",
            path,
            path_map.keys()
        );
    }

    gitea.stop().await.unwrap();
}

/// Verify that `fetch_objects` can fetch a single blob by its OID.
#[tokio::test]
async fn test_fetch_objects_single_blob() {
    let (gitea, repo_url, token) = setup().await;

    let path_map = ls_tree(&repo_url, "refs/heads/main", Some(&token))
        .await
        .unwrap();
    let oid = path_map.get("2024/10-10/job.zip").expect("path exists");

    let objects = fetch_objects(&repo_url, &[oid], Some(&token))
        .await
        .unwrap();

    assert_eq!(objects.len(), 1);
    let oid_obj = ObjectId::from_hex(oid.as_bytes()).unwrap();
    let content = objects.get(&oid_obj).expect("blob should be present");
    let expected = get_expected_content("2024/10-10/job.zip");
    assert_eq!(content, &expected);

    gitea.stop().await.unwrap();
}

/// Verify that `fetch_objects` can fetch multiple blobs in a single request.
#[tokio::test]
async fn test_fetch_objects_multiple_blobs() {
    let (gitea, repo_url, token) = setup().await;

    let path_map = ls_tree(&repo_url, "refs/heads/main", Some(&token))
        .await
        .unwrap();
    let paths = ["2024/10-10/job.zip", "2024/10-10/company.zip"];
    let oids: Vec<&str> = paths
        .iter()
        .map(|p| path_map.get(*p).expect("path exists").as_str())
        .collect();

    let objects = fetch_objects(&repo_url, &oids, Some(&token))
        .await
        .unwrap();

    assert_eq!(objects.len(), 2);
    for path in &paths {
        let oid = path_map.get(*path).unwrap();
        let oid_obj = ObjectId::from_hex(oid.as_bytes()).unwrap();
        let content = objects.get(&oid_obj).expect("blob should be present");
        let expected = get_expected_content(path);
        assert_eq!(content, &expected, "content mismatch for {}", path);
    }

    gitea.stop().await.unwrap();
}

/// Verify that `sparse_checkout` fetches a single file's content correctly.
#[tokio::test]
async fn test_sparse_checkout_single_file() {
    let (gitea, repo_url, token) = setup().await;

    let result = sparse_checkout(
        &repo_url,
        "refs/heads/main",
        &["2024/10-10/job.zip"],
        Some(&token),
    )
    .await
    .unwrap();

    assert_eq!(result.len(), 1);
    let expected = get_expected_content("2024/10-10/job.zip");
    assert_eq!(
        result.get("2024/10-10/job.zip").unwrap(),
        &expected,
        "content mismatch"
    );

    gitea.stop().await.unwrap();
}

/// Verify that `sparse_checkout` returns multiple files correctly.
#[tokio::test]
async fn test_sparse_checkout_multiple_files() {
    let (gitea, repo_url, token) = setup().await;

    let paths = ["2024/10-10/job.zip", "2024/12-31/company.zip"];
    let result = sparse_checkout(&repo_url, "refs/heads/main", &paths, Some(&token))
        .await
        .unwrap();

    assert_eq!(result.len(), 2);
    for path in &paths {
        let expected = get_expected_content(*path);
        assert_eq!(
            result.get(*path).unwrap(),
            &expected,
            "content mismatch for {}",
            path
        );
    }

    gitea.stop().await.unwrap();
}

/// Verify that `sparse_checkout` returns an empty map for non-existent paths.
#[tokio::test]
async fn test_sparse_checkout_non_existent_path() {
    let (gitea, repo_url, token) = setup().await;

    let result = sparse_checkout(
        &repo_url,
        "refs/heads/main",
        &["nonexistent/path.txt"],
        Some(&token),
    )
    .await
    .unwrap();

    assert!(result.is_empty());

    gitea.stop().await.unwrap();
}

/// Verify that `sparse_checkout` only returns results for existing paths
/// when given a mix of existing and non-existent paths.
#[tokio::test]
async fn test_sparse_checkout_mixed_paths() {
    let (gitea, repo_url, token) = setup().await;

    let result = sparse_checkout(
        &repo_url,
        "refs/heads/main",
        &["2024/10-10/job.zip", "nope/bad.txt", "README.md"],
        Some(&token),
    )
    .await
    .unwrap();

    assert_eq!(result.len(), 2, "expected only existing paths");
    assert!(result.contains_key("2024/10-10/job.zip"));
    assert!(result.contains_key("README.md"));

    gitea.stop().await.unwrap();
}

fn get_expected_content(repo_path: &str) -> Vec<u8> {
    let resources_data_path = Path::new("tests").join("resources").join("data");
    let file_map = create_test_file_map();
    let local_file = file_map.get(repo_path).unwrap_or_else(|| panic!("unknown repo path: {}", repo_path));
    fs::read(resources_data_path.join(local_file)).unwrap()
}

async fn setup() -> (ContainerAsync<Gitea>, String, String) {
    // start gitea container
    let (gitea, _, http_port, _, _) = setup_git_server().await;
    let repo_url: &str = &format!("http://localhost:{http_port}/{ADMIN_USERNAME}/{DATA_REPO}.git");

    // create API access token
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

    // clone the repo locally via HTTP
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

    // add test data files as blobs into the repo tree
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

    // commit and push to remote
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

    // cleanup local clone
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
