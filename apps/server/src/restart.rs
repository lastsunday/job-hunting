#![cfg(unix)]

use std::{env, os::unix::process::CommandExt, process::Command};

use framework::utils;

use tracing::{debug, info};

#[cold]
pub(super) fn restart() -> ! {
    // SAFETY: We have allowed an override for the case where the current_exe() has
    // been replaced or removed. By default the server will fail to restart if the
    // binary has been replaced (i.e. by cargo); this is for security purposes.
    // Command::exec() used to panic in that case.
    //
    // We can (and do) prevent that panic by checking the result of current_exe()
    // prior to committing to restart, returning an error to the user without any
    // unexpected shutdown. In a nutshell that is the excuse for this unsafety.
    // Nevertheless, we still want a way to override the restart presentation (i.e.
    // admin server restart --force).
    let exe = unsafe { utils::sys::current_exe().expect("program path must be available") };
    let envs = env::vars();
    let args = env::args().skip(1);
    debug!(?exe, ?args, ?envs, "Restart");

    info!("Restart");

    let error = Command::new(exe).args(args).envs(envs).exec();
    panic!("{error:?}");
}
