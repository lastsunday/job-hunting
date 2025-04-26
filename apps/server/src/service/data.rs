use core::result::Result;
use git2::{Cred, RemoteCallbacks, Repository};
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
    let mut builder = git2::build::RepoBuilder::new();
    builder.fetch_options(fo);
    match builder.clone(url, path) {
        Ok(repo) => Ok(repo),
        Err(e) => Err(Box::new(e)),
    }
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
    let mut builder = git2::build::RepoBuilder::new();
    builder.fetch_options(fo);
    match builder.clone(url, path) {
        Ok(repo) => Ok(repo),
        Err(e) => Err(Box::new(e)),
    }
}
