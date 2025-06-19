use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct DatabaseConfig {
    pub url: Option<String>,
}

impl DatabaseConfig {
    pub fn url(&self) -> &str {
        self.url.as_deref().unwrap_or("sqlite::memory:")
    }
}
