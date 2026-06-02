use std::sync::LazyLock;

use anyhow::Context;
use config::{Config, FileFormat};
use framework::config::{ServerConfig, auth::AuthConfig, database::DatabaseConfig};
use serde::Deserialize;

static CONFIG: LazyLock<AppConfig> =
    LazyLock::new(|| AppConfig::load().expect("Failed to initialize config"));

#[derive(Debug, Default, Deserialize)]
pub struct AppConfig {
    server: ServerConfig,
    database: DatabaseConfig,
    auth: AuthConfig,
    task: TaskConfig,
}

impl AppConfig {
    pub fn load() -> anyhow::Result<Self> {
        match Config::builder()
            .add_source(
                config::File::with_name("application")
                    .format(FileFormat::Yaml)
                    .required(false),
            )
            .add_source(
                config::Environment::with_prefix("APP")
                    .try_parsing(true)
                    .separator("_")
                    .list_separator(","),
            )
            .build()
            .with_context(|| anyhow::anyhow!("Failed to load config"))?
            .try_deserialize()
        {
            Ok(config) => {
                tracing::info!("Load config file successfully");
                tracing::info!("{:#?}", config);
                Ok(config)
            }
            Err(e) => {
                tracing::warn!(
                    "Failed to load config file,using default config,error = {:?}",
                    e
                );
                let config = Self::new();
                tracing::info!("{:#?}", config);
                Ok(config)
            }
        }
    }

    pub fn new() -> Self {
        Self {
            server: ServerConfig::new(),
            database: DatabaseConfig::new(),
            auth: AuthConfig::new(),
            task: TaskConfig::new(),
        }
    }

    pub fn server(&self) -> &ServerConfig {
        &self.server
    }

    pub fn database(&self) -> &DatabaseConfig {
        &self.database
    }

    pub fn auth(&self) -> &AuthConfig {
        &self.auth
    }

    pub fn task(&self) -> &TaskConfig {
        &self.task
    }
}

pub fn get() -> &'static AppConfig {
    &CONFIG
}

#[derive(Debug, Deserialize)]
pub struct TaskConfig {
    history_file_max_size: Option<i64>,
}

impl Default for TaskConfig {
    fn default() -> Self {
        Self::new()
    }
}

impl TaskConfig {
    pub fn new() -> Self {
        Self {
            history_file_max_size: Some(5 * 1024 * 1024 * 1024),
        }
    }

    pub fn history_file_max_size(&self) -> i64 {
        self.history_file_max_size.unwrap_or(5 * 1024 * 1024 * 1024)
    }
}
