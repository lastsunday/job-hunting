use serde::Deserialize;

#[derive(Debug, Default, Deserialize, Clone)]
pub struct SyncConfig {
    pub git: GitSyncConfig,
    pub schedule: ScheduleConfig,
}

#[derive(Debug, Default, Deserialize, Clone)]
pub struct GitSyncConfig {
    pub enabled: bool,
    pub base_url: Option<String>,
    pub token: Option<String>,
    pub default_repo: Option<String>,
}

#[derive(Debug, Default, Deserialize, Clone)]
pub struct ScheduleConfig {
    pub enabled: bool,
    pub cron: Option<String>,
    pub sync_jobs: bool,
    pub sync_companies: bool,
}

impl SyncConfig {
    pub fn new() -> Self {
        Self {
            git: GitSyncConfig::new(),
            schedule: ScheduleConfig::new(),
        }
    }
}

impl GitSyncConfig {
    pub fn new() -> Self {
        Self {
            enabled: false,
            base_url: Some(String::from("https://api.github.com")),
            token: None,
            default_repo: None,
        }
    }

    pub fn enabled(&self) -> bool {
        self.enabled
    }

    pub fn base_url(&self) -> &str {
        self.base_url.as_deref().unwrap_or("https://api.github.com")
    }

    pub fn token(&self) -> Option<&str> {
        self.token.as_deref()
    }

    pub fn default_repo(&self) -> Option<&str> {
        self.default_repo.as_deref()
    }
}

impl ScheduleConfig {
    pub fn new() -> Self {
        Self {
            enabled: false,
            cron: Some(String::from("0 0 * * *")),
            sync_jobs: true,
            sync_companies: true,
        }
    }

    pub fn enabled(&self) -> bool {
        self.enabled
    }

    pub fn cron(&self) -> &str {
        self.cron.as_deref().unwrap_or("0 0 * * *")
    }

    pub fn sync_jobs(&self) -> bool {
        self.sync_jobs
    }

    pub fn sync_companies(&self) -> bool {
        self.sync_companies
    }
}

impl SyncConfig {
    pub fn git(&self) -> &GitSyncConfig {
        &self.git
    }

    pub fn schedule(&self) -> &ScheduleConfig {
        &self.schedule
    }
}
