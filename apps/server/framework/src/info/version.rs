use std::sync::OnceLock;

static BRANDING: &str = "job-hunting";
static SEMANTIC: &str = env!("CARGO_PKG_VERSION");

static VERSION: OnceLock<String> = OnceLock::new();
static USER_AGENT: OnceLock<String> = OnceLock::new();

#[inline]
#[must_use]
pub fn name() -> &'static str {
    BRANDING
}

#[inline]
pub fn version() -> &'static str {
    VERSION.get_or_init(init_version)
}

#[inline]
pub fn user_agent() -> &'static str {
    USER_AGENT.get_or_init(init_user_agent)
}

fn init_user_agent() -> String {
    format!("{}/{}", name(), version())
}

fn init_version() -> String {
    build_metadata::version_tag().map_or_else(
        || SEMANTIC.to_owned(),
        |extra| format!("{SEMANTIC} ({extra})"),
    )
}
