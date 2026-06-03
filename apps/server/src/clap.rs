//! Integration with `clap`

use std::path::PathBuf;

use clap::{ArgAction, Parser};
use figment::{Figment, value::Value};
use framework::utils::sys::available_parallelism;

/// Commandline arguments
#[derive(Parser, Debug)]
#[clap(
	about,
	long_about = None,
	name = framework::name(),
	version = framework::version(),
)]
pub struct Args {
    #[arg(short, long)]
    /// Path to the config TOML file (optional)
    pub config: Option<Vec<PathBuf>>,

    /// Override a configuration variable using TOML 'key=value' syntax
    #[arg(long, short('O'))]
    pub option: Vec<String>,

    /// Override the tokio worker_thread count.
    #[arg(
		long,
		hide(true),
		env = "TOKIO_WORKER_THREADS",
    default_value = available_parallelism().to_string()
	  )]
    pub worker_threads: usize,

    /// Override the tokio global_queue_interval.
    #[arg(
        long,
        hide(true),
        env = "TOKIO_GLOBAL_QUEUE_INTERVAL",
        default_value = "192"
    )]
    pub global_event_interval: u32,

    /// Override the tokio event_interval.
    #[arg(long, hide(true), env = "TOKIO_EVENT_INTERVAL", default_value = "512")]
    pub kernel_event_interval: u32,

    /// Override the tokio max_io_events_per_tick.
    #[arg(
        long,
        hide(true),
        env = "TOKIO_MAX_IO_EVENTS_PER_TICK",
        default_value = "512"
    )]
    pub kernel_events_per_tick: usize,

    /// Toggles worker affinity feature.
    #[arg(
		long,
		hide(true),
		env = "JH_RUNTIME_WORKER_AFFINITY",
		action = ArgAction::Set,
		num_args = 0..=1,
		require_equals(false),
		default_value = "true",
		default_missing_value = "true",
	)]
    pub worker_affinity: bool,

    /// Toggles feature to promote memory reclamation by the operating system
    /// when tokio worker runs out of work.
    #[arg(
		long,
		hide(true),
		env = "JH_RUNTIME_GC_ON_PARK",
		action = ArgAction::Set,
		num_args = 0..=1,
		require_equals(false),
	)]
    pub gc_on_park: Option<bool>,

    /// Toggles muzzy decay for jemalloc arenas associated with a tokio
    /// worker (when worker-affinity is enabled). Setting to false releases
    /// memory to the operating system using MADV_FREE without MADV_DONTNEED.
    /// Setting to false increases performance by reducing pagefaults, but
    /// resident memory usage appears high until there is memory pressure. The
    /// default is true unless the system has four or more cores.
    #[arg(
		long,
		hide(true),
		env = "JH_RUNTIME_GC_MUZZY",
		action = ArgAction::Set,
		num_args = 0..=1,
		require_equals(false),
	)]
    pub gc_muzzy: Option<bool>,
}

/// Parse commandline arguments into structured data
#[must_use]
pub(crate) fn parse() -> Args {
    Args::parse()
}

/// Synthesize any command line options with configuration file options.
pub(crate) fn update(mut config: Figment, args: &Args) -> Result<Figment, anyhow::Error> {
    // All other individual overrides can go last in case we have options which
    // set multiple conf items at once and the user still needs granular overrides.
    for option in &args.option {
        let (key, val) = option
            .split_once('=')
            .ok_or_else(|| anyhow::anyhow!("Missing '=' in -O/--option: {option:?}"))?;

        if key.is_empty() {
            return Err(anyhow::anyhow!("Missing key= in -O/--option: {option:?}"));
        }

        if val.is_empty() {
            return Err(anyhow::anyhow!("Missing =val in -O/--option: {option:?}"));
        }

        // The value has to pass for what would appear as a line in the TOML file.
        let val = toml::from_str::<Value>(option)?;
        let Value::Dict(_, val) = val else {
            panic!("Unexpected Figment Value: {val:#?}");
        };

        // Figment::merge() overrides existing
        config = config.merge((key, val[key].clone()));
    }

    Ok(config)
}
