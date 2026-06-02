pub mod database;
pub mod server;
pub mod task;

use std::path::PathBuf;

use anyhow::Error;
use figment::{
    Figment,
    providers::{Env, Format, Toml},
};
use macros::config_example_generator;
use serde::Deserialize;

/// ### Job Hunting Configuration
///
/// ### THIS FILE IS GENERATED.
///
/// You should rename this file before configuring your server.
#[derive(Debug, Deserialize)]
#[config_example_generator(
    filename = "application-example.toml",
    section = "global",
    undocumented = "# This item is undocumented. Please contribute documentation for it.",
    header = r#"### Job Hunting Configuration
###
### THIS FILE IS GENERATED.
###
### You should rename this file before configuring your server.
###
"#,
    ignore = "config_paths catchall"
)]
pub struct Config {
    /// The port the server will listen on.
    ///
    /// default: 3000
    #[serde(default = "default_server_port")]
    pub server_port: u16,

    /// The database connection URL.
    ///
    /// default: sqlite://db.sqlite?mode=rwc
    #[serde(default = "default_database_url")]
    pub database_url: String,

    /// Secret key for signing access tokens.
    ///
    /// default: "QLjJTeVblAlM47de"
    #[serde(default = "default_auth_access_token_secret")]
    pub auth_access_token_secret: String,

    /// Access token expiration time in seconds.
    ///
    /// default: 28800
    #[serde(default = "default_auth_access_token_expires_in")]
    pub auth_access_token_expires_in: u64,

    /// Secret key for signing refresh tokens.
    ///
    /// default: "N8lI0uitNzJl6vYK"
    #[serde(default = "default_auth_refresh_token_secret")]
    pub auth_refresh_token_secret: String,

    /// Refresh token expiration time in seconds.
    ///
    /// default: 15897600
    #[serde(default = "default_auth_refresh_token_expires_in")]
    pub auth_refresh_token_expires_in: u64,

    /// JWT audience claim.
    ///
    /// default: "audience"
    #[serde(default = "default_auth_audience")]
    pub auth_audience: String,

    /// JWT issuer claim.
    ///
    /// default: "issuer"
    #[serde(default = "default_auth_issuer")]
    pub auth_issuer: String,

    /// OAuth client ID.
    ///
    /// default: "d1aicsr57dijo7h963ig"
    #[serde(default = "default_auth_client_id")]
    pub auth_client_id: String,

    /// OAuth client secret.
    ///
    /// default: "ujTgh2lEQYy0PXhK"
    #[serde(default = "default_auth_client_secret")]
    pub auth_client_secret: String,

    /// Maximum size of history file in bytes.
    ///
    /// default: 5368709120
    #[serde(default = "default_history_file_max_size")]
    pub history_file_max_size: i64,
}

impl Config {
    pub fn load(paths: &[PathBuf]) -> Result<Figment, Error> {
        let envs = [Env::var("APP_CONFIG")];
        let config = envs
            .into_iter()
            .flatten()
            .map(Toml::file)
            .chain(paths.iter().cloned().map(Toml::file))
            .fold(Figment::new(), |config, file| config.merge(file))
            .merge(Env::prefixed("APP_").global().split("__"));

        Ok(config)
    }

    pub fn new(raw_config: &Figment) -> Result<Self, Error> {
        let config = raw_config.extract::<Self>().map_err(|e| {
            anyhow::anyhow!("There was a problem with your configuration file: {e}")
        })?;

        Ok(config)
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            server_port: default_server_port(),
            database_url: default_database_url(),
            auth_access_token_secret: default_auth_access_token_secret(),
            auth_access_token_expires_in: default_auth_access_token_expires_in(),
            auth_refresh_token_secret: default_auth_refresh_token_secret(),
            auth_refresh_token_expires_in: default_auth_refresh_token_expires_in(),
            auth_audience: default_auth_audience(),
            auth_issuer: default_auth_issuer(),
            auth_client_id: default_auth_client_id(),
            auth_client_secret: default_auth_client_secret(),
            history_file_max_size: default_history_file_max_size(),
        }
    }
}

fn default_server_port() -> u16 {
    3000
}

fn default_database_url() -> String {
    String::from("sqlite://db.sqlite?mode=rwc")
}

fn default_auth_access_token_secret() -> String {
    String::from("QLjJTeVblAlM47de")
}

fn default_auth_access_token_expires_in() -> u64 {
    28800
}

fn default_auth_refresh_token_secret() -> String {
    String::from("N8lI0uitNzJl6vYK")
}

fn default_auth_refresh_token_expires_in() -> u64 {
    15897600
}

fn default_auth_audience() -> String {
    String::from("audience")
}

fn default_auth_issuer() -> String {
    String::from("issuer")
}

fn default_auth_client_id() -> String {
    String::from("d1aicsr57dijo7h963ig")
}

fn default_auth_client_secret() -> String {
    String::from("ujTgh2lEQYy0PXhK")
}

fn default_history_file_max_size() -> i64 {
    5 * 1024 * 1024 * 1024
}
