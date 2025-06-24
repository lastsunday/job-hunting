use jsonwebtoken::{
    DecodingKey, EncodingKey, Header, Validation, decode, encode, get_current_timestamp,
};
use serde::{Deserialize, Serialize};
use std::{sync::OnceLock, time::Duration};
use utoipa::ToSchema;

use crate::config::auth::AuthConfig;

static JWT_INSTANCE: OnceLock<Jwt> = OnceLock::new();

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct Principal {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    jti: String,
    sub: String,
    aud: String,
    iss: String,
    iat: u64,
    exp: u64,
}

pub struct Jwt {
    encode_secret: EncodingKey,
    decode_secret: DecodingKey,
    header: Header,
    validation: Validation,
    expiration: Duration,
    audience: String,
    issuer: String,
}

impl Jwt {
    fn new(config: AuthConfig) -> Self {
        let mut validation = Validation::new(jsonwebtoken::Algorithm::HS256);
        validation.set_audience(&[String::from(config.audience())]);
        validation.set_issuer(&[String::from(config.issuer())]);
        validation.set_required_spec_claims(&["jti", "sub", "aud", "iss", "iat", "exp"]);

        let secret = config.secret().as_bytes();
        Self {
            encode_secret: EncodingKey::from_secret(secret),
            decode_secret: DecodingKey::from_secret(secret),
            header: Header::new(jsonwebtoken::Algorithm::HS256),
            validation,
            expiration: Duration::from_secs(config.expiration()),
            audience: String::from(config.audience()),
            issuer: String::from(config.issuer()),
        }
    }

    pub fn encode(&self, principal: Principal) -> anyhow::Result<String> {
        let current_timestamp = get_current_timestamp();
        let claims = Claims {
            jti: xid::new().to_string(),
            sub: format!("{}:{}", principal.id, principal.name),
            aud: self.audience.clone(),
            iss: self.issuer.clone(),
            iat: current_timestamp,
            exp: current_timestamp.saturating_add(self.expiration.as_secs()),
        };
        Ok(encode(&self.header, &claims, &self.encode_secret)?)
    }

    pub fn decode(&self, token: &str) -> anyhow::Result<Principal> {
        let claims: Claims = decode(token, &self.decode_secret, &self.validation)?.claims;

        let mut parts = claims.sub.splitn(2, ':');
        let principal = Principal {
            id: parts.next().unwrap().to_string(),
            name: parts.next().unwrap().to_string(),
        };
        Ok(principal)
    }

    pub fn init(config: AuthConfig) -> &'static Jwt {
        JWT_INSTANCE.get_or_init(|| -> Self { Self::new(config) })
    }

    pub fn global() -> &'static Jwt {
        JWT_INSTANCE.get().unwrap()
    }
}
