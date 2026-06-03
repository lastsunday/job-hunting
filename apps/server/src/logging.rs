use std::{
    io,
    sync::{
        Arc, RwLock,
        atomic::{AtomicUsize, Ordering},
    },
};

use anyhow::Context;
use api::config::log::{LogConfig, LogFormat, LogRotation};
use tracing_appender::rolling;
use tracing_subscriber::{
    Registry,
    filter::{EnvFilter, LevelFilter},
    fmt::{self, format::FmtSpan, writer::BoxMakeWriter},
    layer::{Filter, Layer, SubscriberExt},
    registry::LookupSpan,
    reload,
};

const LEVELS: &[LevelFilter] = &[
    LevelFilter::ERROR,
    LevelFilter::WARN,
    LevelFilter::INFO,
    LevelFilter::DEBUG,
    LevelFilter::TRACE,
];

struct ReloadHandle {
    set_level: Box<dyn Fn(LevelFilter) + Send + Sync>,
}

impl ReloadHandle {
    fn new<S: tracing::Subscriber + 'static>(handle: reload::Handle<EnvFilter, S>) -> Self {
        Self {
            set_level: Box::new(move |level: LevelFilter| {
                let filter = EnvFilter::builder()
                    .with_default_directive(level.into())
                    .from_env_lossy();
                let _ = handle.modify(|f| *f = filter);
            }),
        }
    }

    fn set(&self, level: LevelFilter) {
        (self.set_level)(level);
    }
}

pub struct LoggingHandle {
    console_ctl: ReloadHandle,
    file_ctl: ReloadHandle,
    pub config: Arc<RwLock<LogConfig>>,
    pub level_index: Arc<AtomicUsize>,
    _console_guard: tracing_appender::non_blocking::WorkerGuard,
    _appender_guard: Option<tracing_appender::non_blocking::WorkerGuard>,
    _flame_guard: Option<tracing_flame::FlushGuard<std::fs::File>>,
}

impl LoggingHandle {
    pub fn cycle_console_level(&self) {
        let idx = self.level_index.fetch_add(1, Ordering::Relaxed);
        let level = LEVELS[idx % LEVELS.len()];
        self.console_ctl.set(level);
    }

    pub fn reload_from_config(&self) {
        if let Ok(cfg) = self.config.read() {
            let level = cfg
                .console_level
                .parse::<LevelFilter>()
                .unwrap_or(LevelFilter::INFO);
            self.console_ctl.set(level);

            let file_level = cfg
                .file_level
                .parse::<LevelFilter>()
                .unwrap_or(LevelFilter::INFO);
            self.file_ctl.set(file_level);
        }
    }
}

fn build_layer<S, W, F>(
    format: LogFormat,
    writer: W,
    filter: F,
) -> Box<dyn Layer<S> + Send + Sync + 'static>
where
    S: tracing::Subscriber + Send + Sync + for<'a> LookupSpan<'a> + 'static,
    W: for<'a> tracing_subscriber::fmt::MakeWriter<'a> + Send + Sync + 'static,
    F: Filter<S> + Send + Sync + 'static,
{
    match format {
        LogFormat::Json => Box::new(
            fmt::layer()
                .with_span_events(FmtSpan::CLOSE)
                .json()
                .with_writer(writer)
                .with_filter(filter),
        ),
        LogFormat::Compact => Box::new(
            fmt::layer()
                .with_span_events(FmtSpan::CLOSE)
                .compact()
                .with_writer(writer)
                .with_filter(filter),
        ),
        LogFormat::Pretty => Box::new(
            fmt::layer()
                .with_span_events(FmtSpan::CLOSE)
                .pretty()
                .with_writer(writer)
                .with_filter(filter),
        ),
        LogFormat::Text => Box::new(
            fmt::layer()
                .with_span_events(FmtSpan::CLOSE)
                .with_writer(writer)
                .with_filter(filter),
        ),
    }
}

pub fn init(config: LogConfig) -> anyhow::Result<LoggingHandle> {
    let console_level = config
        .console_level
        .parse::<LevelFilter>()
        .context("invalid console log level")?;
    let file_level = config
        .file_level
        .parse::<LevelFilter>()
        .context("invalid file log level")?;

    let console_filter = if config.console_enabled {
        EnvFilter::builder()
            .with_default_directive(console_level.into())
            .from_env_lossy()
    } else {
        EnvFilter::new("off")
    };
    let (console_filter_layer, console_reload) = reload::Layer::new(console_filter);

    let file_filter = if config.file_enabled {
        EnvFilter::builder()
            .with_default_directive(file_level.into())
            .from_env_lossy()
    } else {
        EnvFilter::new("off")
    };
    let (file_filter_layer, file_reload) = reload::Layer::new(file_filter);

    let (file_writer, appender_guard) = if config.file_enabled {
        let rotation = to_tracing_rotation(config.file_rotation);
        let appender = rolling::RollingFileAppender::builder()
            .rotation(rotation)
            .filename_prefix(&config.file_name)
            .max_log_files(config.file_max_files)
            .build(&config.file_directory)
            .context("failed to create file appender")?;
        let (non_blocking, guard) = tracing_appender::non_blocking(appender);
        (BoxMakeWriter::new(non_blocking), Some(guard))
    } else {
        (BoxMakeWriter::new(io::stdout), None)
    };

    let (console_writer, console_guard) = tracing_appender::non_blocking(io::stdout());

    let subscriber = Registry::default()
        .with(build_layer(
            config.console_format,
            console_writer,
            console_filter_layer,
        ))
        .with(build_layer(
            config.file_format,
            file_writer,
            file_filter_layer,
        ));

    let flame_guard = match config.flame_enabled {
        true => {
            let path = std::path::Path::new(&config.flame_directory).join("trace.folded");
            if let Some(parent) = path.parent() {
                std::fs::create_dir_all(parent).ok();
            }
            let flame_file = std::fs::File::create(&path).context("failed to create flame file")?;
            let flame_layer = tracing_flame::FlameLayer::new(flame_file);
            let guard = flame_layer.flush_on_drop();
            let sub = subscriber.with(flame_layer);
            if config.tokio_console_enabled {
                let console_layer = console_subscriber::Builder::default().spawn();
                tracing::subscriber::set_global_default(sub.with(console_layer))
                    .context("failed to set global default subscriber")?;
            } else {
                tracing::subscriber::set_global_default(sub)
                    .context("failed to set global default subscriber")?;
            }
            Some(guard)
        }
        false => {
            if config.tokio_console_enabled {
                let console_layer = console_subscriber::Builder::default().spawn();
                tracing::subscriber::set_global_default(subscriber.with(console_layer))
                    .context("failed to set global default subscriber")?;
            } else {
                tracing::subscriber::set_global_default(subscriber)
                    .context("failed to set global default subscriber")?;
            }
            None
        }
    };

    Ok(LoggingHandle {
        console_ctl: ReloadHandle::new(console_reload),
        file_ctl: ReloadHandle::new(file_reload),
        config: Arc::new(RwLock::new(config)),
        level_index: Arc::new(AtomicUsize::new(0)),
        _console_guard: console_guard,
        _appender_guard: appender_guard,
        _flame_guard: flame_guard,
    })
}

fn to_tracing_rotation(r: LogRotation) -> rolling::Rotation {
    match r {
        LogRotation::Daily => rolling::Rotation::DAILY,
        LogRotation::Hourly => rolling::Rotation::HOURLY,
        LogRotation::Never => rolling::Rotation::NEVER,
    }
}
