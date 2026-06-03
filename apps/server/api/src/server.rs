use std::{
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
    time::SystemTime,
};

use tokio::{runtime, sync::broadcast};

use crate::{config, config::Config};

/// Server runtime state; public portion
pub struct Server {
    /// Configured name of server. This is the same as the one in the config
    /// but developers can (and should) reference this string instead.
    pub name: String,

    /// Server-wide configuration instance
    pub config: config::Manager,

    /// Timestamp server was started; used for uptime.
    pub started: SystemTime,

    /// Reload/shutdown pending indicator; server is shutting down. This is an
    /// observable used on shutdown and should not be modified.
    pub stopping: AtomicBool,

    /// Reload/shutdown desired indicator; when false, shutdown is desired. This
    /// is an observable used on shutdown and modifying is not recommended.
    pub reloading: AtomicBool,

    /// Restart desired; when true, restart it desired after shutdown.
    pub restarting: AtomicBool,

    /// Handle to the runtime
    pub runtime: Option<runtime::Handle>,

    /// Reload/shutdown signal
    pub signal: broadcast::Sender<&'static str>,
}

impl Server {
    #[must_use]
    pub fn new(config: Config, runtime: Option<runtime::Handle>) -> Self {
        Self {
            name: config.server_name.clone(),
            config: config::Manager::new(config),
            started: SystemTime::now(),
            stopping: AtomicBool::new(false),
            reloading: AtomicBool::new(false),
            restarting: AtomicBool::new(false),
            runtime: runtime.clone(),
            signal: broadcast::channel::<&'static str>(1).0,
        }
    }

    pub fn reload(&self) -> Result<(), anyhow::Error> {
        if self.reloading.swap(true, Ordering::AcqRel) {
            return Err(anyhow::anyhow!("Reloading already in progress"));
        }

        if self.stopping.swap(true, Ordering::AcqRel) {
            return Err(anyhow::anyhow!("Shutdown already in progress"));
        }

        self.signal("SIGINT").inspect_err(|_| {
            self.stopping.store(false, Ordering::Release);
            self.reloading.store(false, Ordering::Release);
        })
    }

    pub fn restart(&self) -> Result<(), anyhow::Error> {
        if self.restarting.swap(true, Ordering::AcqRel) {
            return Err(anyhow::anyhow!("Restart already in progress"));
        }

        self.shutdown().inspect_err(|_| {
            self.restarting.store(false, Ordering::Release);
        })
    }

    pub fn shutdown(&self) -> Result<(), anyhow::Error> {
        if self.stopping.swap(true, Ordering::AcqRel) {
            return Err(anyhow::anyhow!("Shutdown already in progress"));
        }

        self.signal("SIGTERM").inspect_err(|_| {
            self.stopping.store(false, Ordering::Release);
        })
    }

    pub fn signal(&self, sig: &'static str) -> Result<(), anyhow::Error> {
        if let Err(e) = self.signal.send(sig) {
            return Err(anyhow::anyhow!("Failed to send signal: {e}"));
        }

        Ok(())
    }

    #[inline]
    pub async fn until_shutdown(self: &Arc<Self>) {
        while self.running() {
            self.signal.subscribe().recv().await.ok();
        }
    }

    #[inline]
    pub fn runtime(&self) -> &runtime::Handle {
        self.runtime
            .as_ref()
            .expect("runtime handle available in Server")
    }

    #[inline]
    pub fn check_running(&self) -> Result<(), anyhow::Error> {
        use std::{io, io::ErrorKind::Interrupted};

        self.running()
            .then_some(())
            .ok_or_else(|| io::Error::new(Interrupted, "Server shutting down"))
            .map_err(Into::into)
    }

    #[inline]
    pub fn running(&self) -> bool {
        !self.is_stopping()
    }

    #[inline]
    pub fn is_stopping(&self) -> bool {
        self.stopping.load(Ordering::Relaxed)
    }

    #[inline]
    pub fn is_reloading(&self) -> bool {
        self.reloading.load(Ordering::Relaxed)
    }

    #[inline]
    pub fn is_restarting(&self) -> bool {
        self.restarting.load(Ordering::Relaxed)
    }

    #[inline]
    pub fn is_ours(&self, name: &str) -> bool {
        name == self.config.server_name
    }
}
