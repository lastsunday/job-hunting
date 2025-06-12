use chrono::{DateTime, FixedOffset};
use migration::MigratorTrait;
use testcontainers::ContainerAsync;
use testcontainers_modules::postgres::Postgres;

#[allow(dead_code)]
pub async fn setup_database() -> (Option<ContainerAsync<Postgres>>, AppState) {
    // postgres
    // let container = postgres::Postgres::default().start().await.unwrap();
    // let host_port = container.get_host_port_ipv4(5432).await.unwrap();
    // let database_url = &format!("postgres://postgres:postgres@127.0.0.1:{host_port}/postgres");

    // sqlite
    let container = None;
    let database_url = &"sqlite::memory:".to_string();
    let conn: sea_orm::DatabaseConnection =
        service::database::establish_connection(Some(database_url.to_string()))
            .await
            .unwrap();
    migration::Migrator::up(&conn, None).await.unwrap();
    let state = AppState { conn };
    (container, state)
}

#[allow(dead_code)]
pub async fn tear_down(container: &Option<ContainerAsync<Postgres>>) {
    if container.is_some() {
        container.as_ref().unwrap().stop().await.unwrap();
    }
}

#[allow(dead_code)]
pub fn str_to_datetime(value: String) -> Option<DateTime<FixedOffset>> {
    DateTime::parse_from_rfc3339(&value).ok()
}

#[allow(dead_code)]
pub fn datetime_to_str(datetime: Option<DateTime<FixedOffset>>) -> String {
    match datetime {
        Some(item) => item.to_rfc3339(),
        None => "".to_owned(),
    }
}

use service::{AppState, util::git::gen_openssh_key};
use std::str;
use testcontainers::runners::AsyncRunner;
use testcontainers_modules::gitea::{self, Gitea, GiteaRepo};
#[allow(dead_code)]
pub const ADMIN_USERNAME: &str = "git-admin";
#[allow(dead_code)]
pub const ADMIN_PASSWORD: &str = "git-admin";
#[allow(dead_code)]
pub const DATA_REPO: &str = "job-hunting-data";

#[allow(dead_code)]
pub async fn setup_git_server() -> (ContainerAsync<Gitea>, u16, u16, String, String) {
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
    let http_port = gitea
        .get_host_port_ipv4(gitea::GITEA_HTTP_PORT)
        .await
        .unwrap();
    (gitea, ssh_port, http_port, private_key, public_key)
}

#[allow(dead_code)]
pub async fn tear_down_git_server(container: Option<ContainerAsync<Gitea>>) {
    if container.is_some() {
        container.as_ref().unwrap().stop().await.unwrap();
    }
}
