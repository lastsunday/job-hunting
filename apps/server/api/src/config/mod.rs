pub mod check;
pub mod database;
pub mod log;
pub mod manager;
pub mod server;
pub mod task;

use std::{collections::BTreeMap, path::PathBuf};

use anyhow::Error;
use either::Either::{self, Left, Right};
use figment::{
    Figment,
    providers::{Env, Format, Toml},
};
use macros::config_example_generator;
use serde::{Deserialize, de::IgnoredAny};
use std::net::SocketAddr;
use std::{
    net::{IpAddr, Ipv4Addr, Ipv6Addr},
    result::Result,
};

pub use self::{check::check, manager::Manager};

const DEPRECATED_KEYS: &[&str] = &[];

/// All the config options for job-hunting.
#[allow(clippy::struct_excessive_bools)]
#[allow(rustdoc::broken_intra_doc_links, rustdoc::bare_urls)]
#[derive(Clone, Debug, Deserialize)]
#[config_example_generator(
    filename = "application-example.toml",
    section = "global",
    undocumented = "# This item is undocumented. Please contribute documentation for it.",
    header = r#"### job-hunting Configuration
###
### THIS FILE IS GENERATED. CHANGES/CONTRIBUTIONS IN THE REPO WILL BE
### OVERWRITTEN!
###
### You should rename this file before configuring your server. Changes to
### documentation and defaults can be contributed in source code at
### src/config/mod.rs. This file is generated when building.
###
### Any values pre-populated are the default values for said config option.
###
### At the minimum, you MUST edit all the config options to your environment
### that say "YOU NEED TO EDIT THIS".
###
"#,
    ignore = "config_paths catchall"
)]
pub struct Config {
    /// default: localhost.localdomain
    #[serde(default = "default_server_name")]
    pub server_name: String,

    /// The default address (IPv4 or IPv6) continuwuity will listen on.
    ///
    /// If you are using Docker or a container NAT networking setup, this must
    /// be "0.0.0.0".
    ///
    ///
    /// default: 127.0.0.1
    #[serde(default = "default_address")]
    pub address: ListeningAddr,

    /// The port(s) continuwuity will listen on.
    ///
    /// For reverse proxying, see:
    /// https://continuwuity.org/deploying/generic.html#setting-up-the-reverse-proxy
    ///
    /// If you are using Docker, don't change this, you'll need to map an
    /// external port to this.
    ///
    /// default: 3000
    #[serde(default = "default_port")]
    pub port: ListeningPort,

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

    /// Enable console log output.
    ///
    /// default: true
    #[serde(default = "default_log_console_enabled")]
    pub log_console_enabled: bool,

    /// Console log level (trace/debug/info/warn/error).
    ///
    /// default: "info"
    #[serde(default = "default_log_console_level")]
    pub log_console_level: String,

    /// Console log format (text/json/compact/pretty).
    ///
    /// default: "text"
    #[serde(default = "default_log_console_format")]
    pub log_console_format: String,

    /// Enable file log output.
    ///
    /// default: false
    #[serde(default = "default_log_file_enabled")]
    pub log_file_enabled: bool,

    /// File log level.
    ///
    /// default: "info"
    #[serde(default = "default_log_file_level")]
    pub log_file_level: String,

    /// File log format.
    ///
    /// default: "json"
    #[serde(default = "default_log_file_format")]
    pub log_file_format: String,

    /// File log output directory.
    ///
    /// default: "./logs"
    #[serde(default = "default_log_file_directory")]
    pub log_file_directory: String,

    /// File log filename prefix.
    ///
    /// default: "server"
    #[serde(default = "default_log_file_name")]
    pub log_file_name: String,

    /// Max rotated log files to retain.
    ///
    /// default: 10
    #[serde(default = "default_log_file_max_files")]
    pub log_file_max_files: usize,

    /// File rotation interval (daily/hourly/never).
    ///
    /// default: "daily"
    #[serde(default = "default_log_file_rotation")]
    pub log_file_rotation: String,

    /// Enable console-subscriber (tokio-console) for async runtime introspection.
    ///
    /// default: false
    #[serde(default = "default_log_tokio_console_enabled")]
    pub log_tokio_console_enabled: bool,

    /// Enable tracing-flame output.
    ///
    /// default: false
    #[serde(default = "default_log_flame_enabled")]
    pub log_flame_enabled: bool,

    /// Flame graph output directory.
    ///
    /// default: "./flame"
    #[serde(default = "default_log_flame_directory")]
    pub log_flame_directory: String,

    #[serde(flatten)]
    #[allow(clippy::zero_sized_map_values)]
    // this is a catchall, the map shouldn't be zero at runtime
    catchall: BTreeMap<String, IgnoredAny>,
}

impl Config {
    /// Pre-initialize config
    pub fn load(paths: &[PathBuf]) -> std::result::Result<Figment, Error> {
        let envs = [Env::var("JH_CONFIG")];
        let mut config = envs
            .into_iter()
            .flatten()
            .map(Toml::file)
            .chain(paths.iter().cloned().map(Toml::file))
            .fold(Figment::new(), |config, file| config.merge(file.nested()))
            .merge(Env::prefixed("JH_").global().split("__"));

        config = config.join(("config_paths", paths));

        Ok(config)
    }

    /// Finalize config
    pub fn new(raw_config: &Figment) -> Result<Self, Error> {
        let config = raw_config.extract::<Self>().map_err(|e| {
            anyhow::anyhow!("There was a problem with your configuration file: {e}")
        })?;

        // don't start if we're listening on both UNIX sockets and TCP at same time
        check::is_dual_listening(raw_config)?;

        Ok(config)
    }

    #[must_use]
    pub fn get_bind_addrs(&self) -> Vec<SocketAddr> {
        let mut addrs = Vec::with_capacity(
            self.get_bind_hosts()
                .len()
                .saturating_mul(self.get_bind_ports().len()),
        );
        for host in &self.get_bind_hosts() {
            for port in &self.get_bind_ports() {
                addrs.push(SocketAddr::new(*host, *port));
            }
        }

        addrs
    }

    fn get_bind_hosts(&self) -> Vec<IpAddr> {
        match &self.address.addrs {
            Left(addr) => vec![*addr],
            Right(addrs) => addrs.clone(),
        }
    }

    fn get_bind_ports(&self) -> Vec<u16> {
        match &self.port.ports {
            Left(port) => vec![*port],
            Right(ports) => ports.clone(),
        }
    }

    pub fn check(&self) -> Result<(), Error> {
        check(self)
    }
}

#[derive(Deserialize, Clone, Debug)]
#[serde(transparent)]
pub struct ListeningPort {
    #[serde(with = "either::serde_untagged")]
    pub ports: Either<u16, Vec<u16>>,
}

#[derive(Deserialize, Clone, Debug)]
#[serde(transparent)]
pub struct ListeningAddr {
    #[serde(with = "either::serde_untagged")]
    pub addrs: Either<IpAddr, Vec<IpAddr>>,
}

fn default_server_name() -> String {
    String::from("localhost")
}

fn default_address() -> ListeningAddr {
    ListeningAddr {
        addrs: Right(vec![Ipv4Addr::LOCALHOST.into(), Ipv6Addr::LOCALHOST.into()]),
    }
}

fn default_port() -> ListeningPort {
    ListeningPort { ports: Left(3000) }
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

fn default_log_console_enabled() -> bool {
    true
}

fn default_log_console_level() -> String {
    String::from("info")
}

fn default_log_console_format() -> String {
    String::from("text")
}

fn default_log_file_enabled() -> bool {
    false
}

fn default_log_file_level() -> String {
    String::from("info")
}

fn default_log_file_format() -> String {
    String::from("json")
}

fn default_log_file_directory() -> String {
    String::from("./logs")
}

fn default_log_file_name() -> String {
    String::from("server")
}

fn default_log_file_max_files() -> usize {
    10
}

fn default_log_file_rotation() -> String {
    String::from("daily")
}

fn default_log_flame_enabled() -> bool {
    false
}

fn default_log_flame_directory() -> String {
    String::from("./flame")
}

fn default_log_tokio_console_enabled() -> bool {
    false
}
