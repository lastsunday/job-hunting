pub mod compute;

use std::path::PathBuf;

pub use compute::available_parallelism;

/// Return a possibly corrected std::env::current_exe() even if the path is
/// marked deleted.
///
/// # Safety
/// This function is declared unsafe because the original result was altered for
/// security purposes, and altering it back ignores those urposes and should be
/// understood by the user.
pub unsafe fn current_exe() -> Result<PathBuf, anyhow::Error> {
    let exe = std::env::current_exe()?;
    match exe.to_str() {
        None => Ok(exe),
        Some(str) => Ok(str
            .strip_suffix(" (deleted)")
            .map(PathBuf::from)
            .unwrap_or(exe)),
    }
}
