use std::sync::Arc;

use tokio::signal;

use super::server::Server;

#[cfg(unix)]
#[tracing::instrument(skip_all, level = "info")]
pub(super) async fn signal(server: Arc<Server>) {
    use signal::unix;
    use unix::SignalKind;

    // const CONSOLE: bool = cfg!(feature = "console");
    const RELOADING: bool = cfg!(all(
        // conduwuit_mods,
        // feature = "conduwuit_mods",
        // not(CONSOLE)
    ));

    let mut quit = unix::signal(SignalKind::quit()).expect("SIGQUIT handler");
    let mut term = unix::signal(SignalKind::terminate()).expect("SIGTERM handler");
    let mut usr1 = unix::signal(SignalKind::user_defined1()).expect("SIGUSR1 handler");
    let mut usr2 = unix::signal(SignalKind::user_defined2()).expect("SIGUSR2 handler");
    loop {
        use tracing::{trace, warn};

        trace!("Installed signal handlers");
        let sig: &'static str;
        tokio::select! {
            _ = signal::ctrl_c() => { sig = "SIGINT"; },
            _ = quit.recv() => { sig = "SIGQUIT"; },
            _ = term.recv() => { sig = "SIGTERM"; },
            _ = usr1.recv() => { sig = "SIGUSR1"; },
            _ = usr2.recv() => { sig = "SIGUSR2"; },
        }

        warn!("Received {sig}");
        let result = if RELOADING && sig == "SIGINT" {
            server.server.reload()
        // } else if matches!(sig, "SIGQUIT" | "SIGTERM") || (!CONSOLE && sig == "SIGINT") {
        } else if matches!(sig, "SIGQUIT" | "SIGTERM") || (sig == "SIGINT") {
            server.server.shutdown()
        } else {
            server.server.signal(sig)
        };

        if let Err(e) = result {
            use tracing::error;

            error!(%sig, "signal: {e}");
        }
    }
}
