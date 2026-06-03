use figment::Figment;
use tracing::{debug, error, info, warn};

use super::Config;

use super::DEPRECATED_KEYS;

#[allow(clippy::cognitive_complexity)]
pub fn check(config: &Config) -> Result<(), anyhow::Error> {
    if cfg!(debug_assertions) {
        warn!("Note: job-hunting was built without optimisations (i.e. debug build)");
    }

    warn_deprecated(config);
    warn_unknown_key(config);

    // if config.sentry && config.sentry_endpoint.is_none() {
    //     return Err!(Config(
    //         "sentry_endpoint",
    //         "Sentry cannot be enabled without an endpoint set"
    //     ));
    // }

    // if cfg!(all(
    //     feature = "hardened_malloc",
    //     feature = "jemalloc",
    //     not(target_env = "msvc")
    // )) {
    //     debug_warn!(
    //         "hardened_malloc and jemalloc compile-time features are both enabled, this causes \
    // jemalloc to be used."
    //     );
    // }
    // if cfg!(not(unix)) && config.unix_socket_path.is_some() {
    //     return Err!(Config(
    //         "unix_socket_path",
    //         "UNIX socket support is only available on *nix platforms. Please remove \
    // 'unix_socket_path' from your config."
    //     ));
    // }

    // if config.unix_socket_path.is_none() && config.get_bind_hosts().is_empty() {
    //     return Err!(Config(
    //         "address",
    //         "No TCP addresses were specified to listen on"
    //     ));
    // }
    //

    // if config.unix_socket_path.is_none() && config.get_bind_ports().is_empty() {
    if config.get_bind_ports().is_empty() {
        return Err(anyhow::anyhow!(
            "config port : No ports were specified to listen on"
        ));
    }

    // if config.unix_socket_path.is_none() {
    config.get_bind_addrs().iter().for_each(|addr| {
        use std::path::Path;

        if addr.ip().is_loopback() {
            info!(
                "Found loopback listening address {addr}, running checks if we're in a \
					 container."
            );

            if Path::new("/proc/vz").exists() /* Guest */ && !Path::new("/proc/bz").exists()
            /* Host */
            {
                error!(
                    "You are detected using OpenVZ with a loopback/localhost listening \
						 address of {addr}. If you are using OpenVZ for containers and you use \
						 NAT-based networking to communicate with the host and guest, this will \
						 NOT work. Please change this to \"0.0.0.0\". If this is expected, you \
						 can ignore.",
                );
            } else if Path::new("/.dockerenv").exists() {
                error!(
                    "You are detected using Docker with a loopback/localhost listening \
						 address of {addr}. If you are using a reverse proxy on the host and \
						 require communication to chobits in the Docker container via \
						 NAT-based networking, this will NOT work. Please change this to \
						 \"0.0.0.0\". If this is expected, you can ignore.",
                );
            } else if Path::new("/run/.containerenv").exists() {
                error!(
                    "You are detected using Podman with a loopback/localhost listening \
						 address of {addr}. If you are using a reverse proxy on the host and \
						 require communication to chobits in the Podman container via \
						 NAT-based networking, this will NOT work. Please change this to \
						 \"0.0.0.0\". If this is expected, you can ignore.",
                );
            }
        }
    });
    Ok(())
}

/// Iterates over all the keys in the config file and warns if there is a
/// deprecated key specified
fn warn_deprecated(config: &Config) {
    debug!("Checking for deprecated config keys");
    let mut was_deprecated = false;
    for key in config
        .catchall
        .keys()
        .filter(|key| DEPRECATED_KEYS.iter().any(|s| s == key))
    {
        warn!("Config parameter \"{}\" is deprecated, ignoring.", key);
        was_deprecated = true;
    }

    if was_deprecated {
        warn!(
            "Read chobits config documentation and check your \
			 configuration if any new configuration parameters should be adjusted"
        );
    }
}

/// iterates over all the catchall keys (unknown config options) and warns
/// if there are any.
fn warn_unknown_key(config: &Config) {
    debug!("Checking for unknown config keys");
    for key in config.catchall.keys().filter(
        |key| "config".to_owned().ne(key.to_owned()), /* "config" is expected */
    ) {
        warn!(
            "Config parameter \"{}\" is unknown to chobits, ignoring.",
            key
        );
    }
}

/// Checks the presence of the `address` and `unix_socket_path` keys in the
/// raw_config, exiting the process if both keys were detected.
pub(super) fn is_dual_listening(raw_config: &Figment) -> Result<(), anyhow::Error> {
    let contains_address = raw_config.contains("address");
    let contains_unix_socket = raw_config.contains("unix_socket_path");
    if contains_address && contains_unix_socket {
        return Err(anyhow::anyhow!(
            "TOML keys \"address\" and \"unix_socket_path\" were both defined. Please specify \
			 only one option."
        ));
    }

    Ok(())
}
