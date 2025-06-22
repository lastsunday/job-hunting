use core::result::Result;
use git2::{Cred, ObjectType, RemoteCallbacks, Repository, Tree, TreeWalkMode, TreeWalkResult};
use ssh_key::{Algorithm, LineEnding, PrivateKey, rand_core::OsRng};
use std::error;
use std::path::Path;

pub fn git_clone_by_ssh(
    url: &str,
    path: &Path,
    private_key: String,
    public_key: String,
) -> Result<Repository, Box<dyn error::Error>> {
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
    git_clone(url, path, fo)
}

pub fn git_clone_by_http(
    url: &str,
    path: &Path,
    username: &str,
    password: &str,
) -> Result<Repository, Box<dyn error::Error>> {
    let mut fo = git2::FetchOptions::new();
    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(|_, _, _| Cred::userpass_plaintext(username, password));
    fo.remote_callbacks(callbacks);
    git_clone(url, path, fo)
}

pub fn ls_tree_to_path_list(tree: &Tree) -> Vec<std::string::String> {
    let mut list = Vec::new();
    tree.walk(TreeWalkMode::PreOrder, |str, entry| {
        if entry.kind().unwrap().eq(&ObjectType::Blob) {
            list.push(format!("{}{}", str, entry.name().unwrap()));
        }
        TreeWalkResult::Ok
    })
    .unwrap();
    list
}

fn git_clone(
    url: &str,
    path: &Path,
    fetch_option: git2::FetchOptions,
) -> Result<Repository, Box<dyn error::Error>> {
    let mut builder = git2::build::RepoBuilder::new();
    builder.fetch_options(fetch_option);
    match builder.clone(url, path) {
        Ok(repo) => Ok(repo),
        Err(e) => Err(Box::new(e)),
    }
}

pub fn gen_openssh_key() -> (String, String) {
    let private_key = PrivateKey::random(&mut OsRng, Algorithm::Ed25519).unwrap();
    (
        private_key
            .to_openssh(LineEnding::CRLF)
            .unwrap()
            .to_string(),
        private_key.public_key().to_openssh().unwrap().to_string(),
    )
}
