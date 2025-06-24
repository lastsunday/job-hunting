use serde::Deserialize;

#[derive(Debug, Default, Deserialize, Clone)]
pub struct AuthConfig {
    secret: Option<String>,
    expiration: Option<u64>,
    audience: Option<String>,
    issuer: Option<String>,
}

impl AuthConfig {
    pub fn new() -> Self {
        Self {
            secret: Some(String::from("QLjJTeVblAlM47de")),
            expiration: Some(3600),
            audience: Some(String::from("audience")),
            issuer: Some(String::from("issuer")),
        }
    }

    pub fn secret(&self) -> &str {
        self.secret.as_deref().unwrap_or("QLjJTeVblAlM47de")
    }

    pub fn expiration(&self) -> u64 {
        self.expiration.unwrap_or(3600)
    }

    pub fn audience(&self) -> &str {
        self.audience.as_deref().unwrap_or("audience")
    }

    pub fn issuer(&self) -> &str {
        self.issuer.as_deref().unwrap_or("issuer")
    }
}
