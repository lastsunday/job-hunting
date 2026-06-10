use serde::Deserialize;

#[derive(Debug, Deserialize, Clone, Default)]
pub struct AuthConfig {
    #[serde(default)]
    pub access_token_secret: Option<String>,
    #[serde(default)]
    pub access_token_expires_in: Option<u64>,
    #[serde(default)]
    pub refresh_token_secret: Option<String>,
    #[serde(default)]
    pub refresh_token_expires_in: Option<u64>,
    #[serde(default)]
    pub audience: Option<String>,
    #[serde(default)]
    pub issuer: Option<String>,
    #[serde(default)]
    pub client_id: Option<String>,
    #[serde(default)]
    pub client_secret: Option<String>,
}

impl AuthConfig {
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
