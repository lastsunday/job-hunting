use serde::Deserialize;

#[derive(Debug, Default, Deserialize, Clone)]
pub struct AuthConfig {
    access_token_secret: Option<String>,
    access_token_expires_in: Option<u64>,
    refresh_token_secret: Option<String>,
    refresh_token_expires_in: Option<u64>,
    audience: Option<String>,
    issuer: Option<String>,
    client_id: Option<String>,
    client_secret: Option<String>,
}

impl AuthConfig {
    pub fn new() -> Self {
        Self {
            access_token_secret: Some(String::from("QLjJTeVblAlM47de")),
            access_token_expires_in: Some(28800),
            refresh_token_secret: Some(String::from("N8lI0uitNzJl6vYK")),
            refresh_token_expires_in: Some(15897600),
            audience: Some(String::from("audience")),
            issuer: Some(String::from("issuer")),
            client_id: Some(String::from("d1aicsr57dijo7h963ig")),
            client_secret: Some(String::from("ujTgh2lEQYy0PXhK")),
        }
    }

    pub fn access_token_secret(&self) -> &str {
        self.access_token_secret
            .as_deref()
            .unwrap_or("QLjJTeVblAlM47de")
    }

    pub fn access_token_expires_in(&self) -> u64 {
        self.access_token_expires_in.unwrap_or(28800)
    }

    pub fn refresh_token_secret(&self) -> &str {
        self.refresh_token_secret
            .as_deref()
            .unwrap_or("N8lI0uitNzJl6vYK")
    }

    pub fn refresh_token_expires_in(&self) -> u64 {
        self.refresh_token_expires_in.unwrap_or(15897600)
    }

    pub fn audience(&self) -> &str {
        self.audience.as_deref().unwrap_or("audience")
    }

    pub fn issuer(&self) -> &str {
        self.issuer.as_deref().unwrap_or("issuer")
    }

    pub fn client_id(&self) -> &str {
        self.client_id.as_deref().unwrap_or("d1aicsr57dijo7h963ig")
    }

    pub fn client_secret(&self) -> &str {
        self.client_secret.as_deref().unwrap_or("ujTgh2lEQYy0PXhK")
    }
}
