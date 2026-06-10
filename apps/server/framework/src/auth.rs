use jsonwebtoken::{
    DecodingKey, EncodingKey, Header, Validation, decode, encode, get_current_timestamp,
};
use serde::{Deserialize, Serialize};
use std::{
    sync::{Arc, OnceLock},
    time::Duration,
};
use utoipa::ToSchema;

use crate::config::auth::AuthConfig;

static JWT_INSTANCE: OnceLock<Jwt> = OnceLock::new();

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct Principal {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    jti: String,
    sub: String,
    aud: String,
    iss: String,
    iat: u64,
    exp: u64,
}

pub struct Jwt {
    header: Header,
    access_token_encode_secret: EncodingKey,
    access_token_decode_secret: DecodingKey,
    access_token_expires_in: Duration,
    access_token_validation: Validation,
    refresh_token_encode_secret: EncodingKey,
    refresh_token_decode_secret: DecodingKey,
    refresh_token_validation: Validation,
    refresh_token_expires_in: Duration,
    audience: String,
    issuer: String,
}

impl Jwt {
    fn new(config: Arc<AuthConfig>) -> Self {
        let mut access_token_validation = Validation::new(jsonwebtoken::Algorithm::HS256);
        access_token_validation.set_audience(&[config
            .audience
            .as_ref()
            .expect("auth audience is empty")
            .as_str()]);
        access_token_validation.set_issuer(&[config
            .issuer
            .as_ref()
            .expect("auth issuer is empty")
            .as_str()]);
        access_token_validation
            .set_required_spec_claims(&["jti", "sub", "aud", "iss", "iat", "exp"]);
        let access_token_secret = config
            .access_token_secret
            .as_ref()
            .expect("auth access token secret is empty");

        let mut refresh_token_validation = Validation::new(jsonwebtoken::Algorithm::HS256);
        refresh_token_validation.set_audience(&[config
            .audience
            .as_ref()
            .expect("auth audience is empty")
            .as_str()]);
        refresh_token_validation.set_issuer(&[config
            .issuer
            .as_ref()
            .expect("auth issuer is empty")
            .as_str()]);
        refresh_token_validation
            .set_required_spec_claims(&["jti", "sub", "aud", "iss", "iat", "exp"]);

        let refresh_token_secret = config
            .refresh_token_secret
            .as_ref()
            .expect("auth refresh token secret is empty");
        Self {
            header: Header::new(jsonwebtoken::Algorithm::HS256),
            access_token_encode_secret: EncodingKey::from_secret(access_token_secret.as_bytes()),
            access_token_decode_secret: DecodingKey::from_secret(access_token_secret.as_bytes()),
            access_token_expires_in: Duration::from_secs(
                config
                    .access_token_expires_in
                    .expect("auth access token expires in is empty"),
            ),
            access_token_validation,
            refresh_token_encode_secret: EncodingKey::from_secret(refresh_token_secret.as_bytes()),
            refresh_token_decode_secret: DecodingKey::from_secret(refresh_token_secret.as_bytes()),
            refresh_token_expires_in: Duration::from_secs(
                config
                    .refresh_token_expires_in
                    .expect("auth refresh token expires in is empty"),
            ),
            refresh_token_validation,
            audience: String::from(config.audience.as_ref().expect("auth audience is empty")),
            issuer: String::from(config.issuer.as_ref().expect("auth issuer is empty")),
        }
    }

    pub fn access_token_encode(&self, principal: Principal) -> anyhow::Result<String> {
        let current_timestamp = get_current_timestamp();
        let claims = Claims {
            jti: xid::new().to_string(),
            sub: format!("{}:{}", principal.id, principal.name),
            aud: self.audience.clone(),
            iss: self.issuer.clone(),
            iat: current_timestamp,
            exp: current_timestamp.saturating_add(self.access_token_expires_in.as_secs()),
        };
        Ok(encode(
            &self.header,
            &claims,
            &self.access_token_encode_secret,
        )?)
    }

    pub fn access_token_decode(&self, token: &str) -> anyhow::Result<Principal> {
        let claims: Claims = decode(
            token,
            &self.access_token_decode_secret,
            &self.access_token_validation,
        )?
        .claims;

        let mut parts = claims.sub.splitn(2, ':');
        let principal = Principal {
            id: parts.next().unwrap().to_string(),
            name: parts.next().unwrap().to_string(),
        };
        Ok(principal)
    }

    pub fn refresh_token_encode(&self, principal: Principal) -> anyhow::Result<String> {
        let current_timestamp = get_current_timestamp();
        let claims = Claims {
            jti: xid::new().to_string(),
            sub: format!("{}:{}", principal.id, principal.name),
            aud: self.audience.clone(),
            iss: self.issuer.clone(),
            iat: current_timestamp,
            exp: current_timestamp.saturating_add(self.refresh_token_expires_in.as_secs()),
        };
        Ok(encode(
            &self.header,
            &claims,
            &self.refresh_token_encode_secret,
        )?)
    }

    pub fn refresh_token_decode(&self, token: &str) -> anyhow::Result<Principal> {
        let claims: Claims = decode(
            token,
            &self.refresh_token_decode_secret,
            &self.refresh_token_validation,
        )?
        .claims;

        let mut parts = claims.sub.splitn(2, ':');
        let principal = Principal {
            id: parts.next().unwrap().to_string(),
            name: parts.next().unwrap().to_string(),
        };
        Ok(principal)
    }

    pub fn access_token_expires_in(&self) -> u64 {
        self.access_token_expires_in.as_secs()
    }

    pub fn refresh_token_expires_in(&self) -> u64 {
        self.refresh_token_expires_in.as_secs()
    }

    pub fn init(config: Arc<AuthConfig>) -> &'static Jwt {
        JWT_INSTANCE.get_or_init(|| -> Self { Self::new(config) })
    }

    pub fn global() -> &'static Jwt {
        JWT_INSTANCE.get().unwrap()
    }
}
