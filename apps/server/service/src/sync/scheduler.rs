use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{interval, Duration};
use sea_orm::DatabaseConnection;

use crate::sync::git_client::GitClient;
use crate::sync::sync_job::JobSync;
use crate::sync::sync_company::CompanySync;
use framework::config::SyncConfig;

pub struct Scheduler {
    running: Arc<AtomicBool>,
    config: Arc<RwLock<SyncConfig>>,
    client: Arc<RwLock<Option<GitClient>>>,
}

impl Scheduler {
    pub fn new(config: SyncConfig) -> Self {
        let base_url = config.git().base_url().to_string();
        let token = config.git().token().map(|t| t.to_string());
        let client = token.map(|t| GitClient::new(base_url, Some(t)));
        
        Self {
            running: Arc::new(AtomicBool::new(false)),
            config: Arc::new(RwLock::new(config)),
            client: Arc::new(RwLock::new(client)),
        }
    }

    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    pub async fn start(&self, conn: DatabaseConnection) {
        if self.running.swap(true, Ordering::SeqCst) {
            tracing::info!("Scheduler already running");
            return;
        }

        let running = self.running.clone();
        let config = self.config.clone();
        let client = self.client.clone();

        tokio::spawn(async move {
            tracing::info!("Scheduler started");
            
            let mut tick = interval(Duration::from_secs(60));
            
            while running.load(Ordering::SeqCst) {
                tick.tick().await;
                
                let config = config.read().await;
                if !config.schedule().enabled() {
                    continue;
                }

                let client_guard = client.read().await;
                if let Some(ref git_client) = *client_guard {
                    let default_repo = config.git().default_repo().unwrap_or("job-hunting-data");
                    
                    if config.schedule().sync_jobs() {
                        match JobSync::sync(&conn, git_client, "user", default_repo, None, None).await {
                            Ok(result) => {
                                tracing::info!("Job sync completed: {} imported", result.imported);
                            }
                            Err(e) => {
                                tracing::error!("Job sync failed: {}", e);
                            }
                        }
                    }

                    if config.schedule().sync_companies() {
                        match CompanySync::sync(&conn, git_client, "user", default_repo, None, None).await {
                            Ok(result) => {
                                tracing::info!("Company sync completed: {} imported", result.imported);
                            }
                            Err(e) => {
                                tracing::error!("Company sync failed: {}", e);
                            }
                        }
                    }
                }
            }
            
            tracing::info!("Scheduler stopped");
        });
    }

    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
        tracing::info!("Scheduler stop requested");
    }

    pub async fn update_config(&self, config: SyncConfig) {
        let mut cfg = self.config.write().await;
        *cfg = config.clone();

        let base_url = config.git().base_url().to_string();
        if let Some(token) = config.git().token() {
            let mut client = self.client.write().await;
            *client = Some(GitClient::new(base_url, Some(token.to_string())));
        }
    }
}

impl Default for Scheduler {
    fn default() -> Self {
        Self::new(SyncConfig::new())
    }
}
