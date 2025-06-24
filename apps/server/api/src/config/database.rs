use serde::Deserialize;

#[derive(Debug, Default, Deserialize)]
pub struct DatabaseConfig {
    url: Option<String>,
}

impl DatabaseConfig {
    pub fn new() -> Self {
        Self {
            url: Some(String::from("sqlite://db.sqlite?mode=rwc")),
        }
    }

    pub fn url(&self) -> &str {
        self.url.as_deref().unwrap_or("sqlite://db.sqlite?mode=rwc")
    }
}
