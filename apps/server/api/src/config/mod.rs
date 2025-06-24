pub mod auth;
pub mod database;
pub mod server;
use std::sync::LazyLock;

use anyhow::Context;
use config::{Config, FileFormat};
use serde::Deserialize;
pub use server::ServerConfig;

use crate::config::{auth::AuthConfig, database::DatabaseConfig};

static CONFIG: LazyLock<AppConfig> =
    LazyLock::new(|| AppConfig::load().expect("Failed to initialize config"));

#[derive(Debug, Default, Deserialize)]
pub struct AppConfig {
    server: ServerConfig,
    database: DatabaseConfig,
    auth: AuthConfig,
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
}

pub fn get() -> &'static AppConfig {
    &CONFIG
}
