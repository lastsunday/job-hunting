use std::sync::Arc;

use api::config::{
    Config,
    log::{LogConfig, LogFormat, LogRotation},
};
use tokio::runtime;
use tracing::info;

use crate::{
    clap::{Args, update},
    logging::LoggingHandle,
};

/// Server runtime state; complete
pub(crate) struct Server {
    /// Server runtime state; public portion
    pub(crate) server: Arc<api::server::Server>,
    /// Logging handle for runtime level changes
    pub(crate) logging_handle: Arc<LoggingHandle>,
}

impl Server {
    pub(crate) fn new(
        args: &Args,
        runtime: Option<&runtime::Handle>,
    ) -> Result<Arc<Self>, anyhow::Error> {
        let _runtime_guard = runtime.map(runtime::Handle::enter);

        let config_paths = args.config.clone().unwrap_or_default();

        let config = Config::load(&config_paths)
            .and_then(|raw| update(raw, args))
            .and_then(|raw| Config::new(&raw))?;

        let log_config = LogConfig {
            console_enabled: config.log_console_enabled,
            console_level: config.log_console_level.clone(),
            console_format: config.log_console_format.parse().unwrap_or(LogFormat::Text),
            file_enabled: config.log_file_enabled,
            file_level: config.log_file_level.clone(),
            file_format: config.log_file_format.parse().unwrap_or(LogFormat::Text),
            file_directory: config.log_file_directory.clone(),
            file_name: config.log_file_name.clone(),
            file_max_files: config.log_file_max_files,
            file_rotation: config
                .log_file_rotation
                .parse()
                .unwrap_or(LogRotation::Daily),
            flame_enabled: config.log_flame_enabled,
            flame_directory: config.log_flame_directory.clone(),
            tokio_console_enabled: config.log_tokio_console_enabled,
        };

        let logging_handle = crate::logging::init(log_config)?;

        config.check()?;

        info!(
            server_name = %config.server_name,
            "{}",
            framework::version(),
        );

        Ok(Arc::new(Self {
            server: Arc::new(api::server::Server::new(config, runtime.cloned())),
            logging_handle: Arc::new(logging_handle),
        }))
    }
}
