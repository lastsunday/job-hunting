use std::sync::Arc;

use api::config::Config;
use tokio::runtime;
use tracing::info;

use crate::clap::{Args, update};

/// Server runtime state; complete
pub(crate) struct Server {
    /// Server runtime state; public portion
    pub(crate) server: Arc<api::server::Server>,
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

        // TODO: need read from config
        tracing_subscriber::fmt::init();

        // logger::init();
        // let (tracing_reload_handle, tracing_flame_guard, capture) = crate::logging::init(&config)?;

        config.check()?;

        info!(
            server_name = %config.server_name,
            "{}",
            framework::version(),
        );

        Ok(Arc::new(Self {
            server: Arc::new(api::server::Server::new(config, runtime.cloned())),
        }))
    }
}
