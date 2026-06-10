use std::process::Command;

fn run_git_command(args: &[&str]) -> Option<String> {
    Command::new("git")
        .args(args)
        .output()
        .ok()
        .filter(|output| output.status.success())
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .map(|s| s.trim().to_owned())
        .filter(|s| !s.is_empty())
}
fn get_env(env_var: &str) -> Option<String> {
    match std::env::var(env_var) {
        Ok(val) if !val.is_empty() => Some(val),
        _ => None,
    }
}
fn main() {
    // built gets the default crate from the workspace. Not sure if this is intended
    // behavior, but it's what we want.
    built::write_built_file().expect("Failed to acquire build-time information");

    // --- Git Information ---
    let mut commit_hash = None;
    let mut commit_hash_short = None;
    let mut remote_url_web = None;

    // Get full commit hash
    if let Some(hash) =
        get_env("GIT_COMMIT_HASH").or_else(|| run_git_command(&["rev-parse", "HEAD"]))
    {
        println!("cargo:rustc-env=GIT_COMMIT_HASH={hash}");
        commit_hash = Some(hash);
    }

    // Get short commit hash
    if let Some(short_hash) = get_env("GIT_COMMIT_HASH_SHORT")
        .or_else(|| run_git_command(&["rev-parse", "--short", "HEAD"]))
    {
        println!("cargo:rustc-env=GIT_COMMIT_HASH_SHORT={short_hash}");
        commit_hash_short = Some(short_hash);
    }

    // Get remote URL and convert to web URL
    if let Some(remote_url_raw) = get_env("GIT_REMOTE_URL")
        .or_else(|| run_git_command(&["config", "--get", "remote.origin.url"]))
    {
        println!("cargo:rustc-env=GIT_REMOTE_URL={remote_url_raw}");
        let web_url = if remote_url_raw.starts_with("https://") {
            remote_url_raw.trim_end_matches(".git").to_owned()
        } else if remote_url_raw.starts_with("git@") {
            remote_url_raw
                .trim_end_matches(".git")
                .replacen(':', "/", 1)
                .replacen("git@", "https://", 1)
        } else if remote_url_raw.starts_with("ssh://") {
            remote_url_raw
                .trim_end_matches(".git")
                .replacen("git@", "", 1)
                .replacen("ssh:", "https:", 1)
        } else {
            // Assume it's already a web URL or unknown format
            remote_url_raw
        };
        println!("cargo:rustc-env=GIT_REMOTE_WEB_URL={web_url}");
        remote_url_web = Some(web_url);
    }

    // Construct remote commit URL
    if let Some(remote_commit_url) = get_env("GIT_REMOTE_COMMIT_URL") {
        println!("cargo:rustc-env=GIT_REMOTE_COMMIT_URL={remote_commit_url}");
    } else if let (Some(base_url), Some(hash)) = (
        &remote_url_web,
        commit_hash.as_ref().or(commit_hash_short.as_ref()),
    ) {
        let commit_page = format!("{base_url}/commit/{hash}");
        println!("cargo:rustc-env=GIT_REMOTE_COMMIT_URL={commit_page}");
    }

    // --- Rerun Triggers ---
    // TODO: The git rerun triggers seem to always run
    // // Rerun if the git HEAD changes
    // println!("cargo:rerun-if-changed=.git/HEAD");
    // // Rerun if the ref pointed to by HEAD changes (e.g., new commit on branch)
    // if let Some(ref_path) = run_git_command(&["symbolic-ref", "--quiet", "HEAD"])
    // { 	println!("cargo:rerun-if-changed=.git/{ref_path}");
    // }

    println!("cargo:rerun-if-env-changed=GIT_COMMIT_HASH");
    println!("cargo:rerun-if-env-changed=GIT_COMMIT_HASH_SHORT");
    println!("cargo:rerun-if-env-changed=GIT_REMOTE_URL");
    println!("cargo:rerun-if-env-changed=GIT_REMOTE_COMMIT_URL");
}
