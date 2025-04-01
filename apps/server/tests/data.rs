use git2::{Cred, RemoteCallbacks};
use server::util::git::gen_openssh_key;
use std::str;
use std::{fs, path::Path};
use testcontainers::runners::AsyncRunner;
use testcontainers_modules::gitea::{self, Gitea, GiteaRepo};
use uuid::Uuid;

const ADMIN_USERNAME: &str = "git-admin";
const ADMIN_PASSWORD: &str = "git-admin";
const DATA_REPO: &str = "job-hunting-data";
const TEST_DIR_PATH: &str = ".data_test_repo";

#[tokio::test]
async fn test_clone_repo_success() {
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
    let repo_url: &str =
        &format!("ssh://git@localhost:{ssh_port}/{ADMIN_USERNAME}/{DATA_REPO}.git");
    let random_dir_name = Uuid::new_v4();
    let local_path = &format!("{TEST_DIR_PATH}/{random_dir_name}");
    let mut fo = git2::FetchOptions::new();
    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(|_url, username_from_url, _allowed_types| {
        Cred::ssh_key_from_memory(
            username_from_url.unwrap(),
            Some(&public_key.clone()),
            &private_key.clone(),
            None,
        )
    });
    callbacks.certificate_check(|_cert, _str| Ok(git2::CertificateCheckStatus::CertificateOk));
    fo.remote_callbacks(callbacks);
    let mut builder = git2::build::RepoBuilder::new();
    builder.fetch_options(fo);
    let path = Path::new(local_path);
    let _repo = match builder.clone(repo_url, path) {
        Ok(repo) => repo,
        Err(e) => {
            fs::remove_dir_all(path.parent().unwrap()).unwrap();
            panic!("failed to clone: {}", e)
        }
    };
    fs::remove_dir_all(path.parent().unwrap()).unwrap();
}
