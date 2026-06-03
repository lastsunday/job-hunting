#[cfg(unix)]
use std::sync::atomic::Ordering;
use std::{error::Error, sync::Arc};

use api::config::{database::DatabaseConfig, server::ServerConfig, task::TaskConfig};
use framework::config::auth::AuthConfig;
use tracing::info;

use crate::{clap::Args, server::Server};
mod clap;
mod restart;
mod runtime;
mod server;
mod signal;

pub fn run() -> Result<(), Box<dyn Error>> {
    let args = clap::parse();
    run_with_args(&args)
}

pub fn run_with_args(args: &Args) -> Result<(), Box<dyn Error>> {
    let runtime = runtime::new(args)?;
    let server = Server::new(args, Some(runtime.handle()))?;

    runtime.spawn(signal::signal(server.clone()));
    runtime.block_on(async_main(&server))?;
    runtime::shutdown(&server, runtime);

    #[cfg(unix)]
    if server.server.restarting.load(Ordering::Acquire) {
        restart::restart();
    }

    info!("Exit");
    Ok(())
}

#[tracing::instrument(
	name = "main",
	parent = None,
	skip_all,
	level = "info"
)]
async fn async_main(server: &Arc<Server>) -> Result<(), anyhow::Error> {
    let config = server.server.config.clone();
    let server_config = Arc::new(ServerConfig {
        server_name: Some(config.server_name.to_owned()),
        address: Some(config.address.to_owned()),
        port: Some(config.port.to_owned()),
    });
    let database_config = Arc::new(DatabaseConfig {
        url: Some(config.database_url.to_owned()),
    });
    let auth_config = Arc::new(AuthConfig {
        access_token_secret: Some(config.auth_access_token_secret.to_owned()),
        access_token_expires_in: Some(config.auth_access_token_expires_in),
        refresh_token_secret: Some(config.auth_refresh_token_secret.to_owned()),
        refresh_token_expires_in: Some(config.auth_refresh_token_expires_in),
        audience: Some(config.auth_audience.to_owned()),
        issuer: Some(config.auth_issuer.to_owned()),
        client_id: Some(config.auth_client_id.to_owned()),
        client_secret: Some(config.auth_client_secret.to_owned()),
    });
    let task_config = Arc::new(TaskConfig {
        history_file_max_size: Some(config.history_file_max_size.to_owned()),
    });
    api::start(server_config, database_config, auth_config, task_config).await?;
    info!("Exit runtime");
    Ok(())
}
