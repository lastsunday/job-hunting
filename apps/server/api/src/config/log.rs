#[derive(Debug, Clone, Copy)]
pub enum LogRotation {
    Daily,
    Hourly,
    Never,
}

impl std::str::FromStr for LogRotation {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "daily" => Ok(Self::Daily),
            "hourly" => Ok(Self::Hourly),
            "never" => Ok(Self::Never),
            _ => Err(format!("unknown log rotation: {s}")),
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub enum LogFormat {
    Text,
    Json,
    Compact,
    Pretty,
}

impl std::str::FromStr for LogFormat {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "json" => Ok(Self::Json),
            "compact" => Ok(Self::Compact),
            "pretty" => Ok(Self::Pretty),
            "text" => Ok(Self::Text),
            _ => Err(format!("unknown log format: {s}")),
        }
    }
}

#[derive(Debug, Clone)]
pub struct LogConfig {
    pub console_enabled: bool,
    pub console_level: String,
    pub console_format: LogFormat,
    pub file_enabled: bool,
    pub file_level: String,
    pub file_format: LogFormat,
    pub file_directory: String,
    pub file_name: String,
    pub file_max_files: usize,
    pub file_rotation: LogRotation,
    pub flame_enabled: bool,
    pub flame_directory: String,
    pub tokio_console_enabled: bool,
}
