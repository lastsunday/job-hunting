use jsonwebtoken::{
    DecodingKey, EncodingKey, Header, Validation, decode, encode, get_current_timestamp,
};
use serde::{Deserialize, Serialize};
use std::{borrow::Cow, sync::LazyLock, time::Duration};
use utoipa::ToSchema;

const DEFAULT_SECRET: &str = "QLjJTeVblAlM47de";
const DEFAULT_AUDIENCE: &str = "audience";
const DEFAULT_ISSUER: &str = "issuer";

static DEFAULT_JWT: LazyLock<Jwt> = LazyLock::new(Jwt::default);

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

#[derive(Debug)]
pub struct JwtConfig {
    pub secret: Cow<'static, str>,
    pub expiration: Duration,
    pub audience: String,
    pub issuer: String,
}

impl Default for JwtConfig {
    fn default() -> Self {
        Self {
            // TODO: need config by random gen or yaml or env
            secret: Cow::Borrowed(DEFAULT_SECRET),
            expiration: Duration::from_secs(60 * 60),
            audience: DEFAULT_AUDIENCE.to_string(),
            issuer: DEFAULT_ISSUER.to_string(),
        }
    }
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
    pub fn new(config: JwtConfig) -> Self {
        let mut validation = Validation::new(jsonwebtoken::Algorithm::HS256);
        validation.set_audience(&[&config.audience]);
        validation.set_issuer(&[&config.issuer]);
        validation.set_required_spec_claims(&["jti", "sub", "aud", "iss", "iat", "exp"]);

        let secret = config.secret.as_bytes();
        Self {
            encode_secret: EncodingKey::from_secret(secret),
            decode_secret: DecodingKey::from_secret(secret),
            header: Header::new(jsonwebtoken::Algorithm::HS256),
            validation,
            expiration: config.expiration,
            audience: config.audience,
            issuer: config.issuer,
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
}

impl Default for Jwt {
    fn default() -> Self {
        Self::new(JwtConfig::default())
    }
}

pub fn get_jwt() -> &'static Jwt {
    &DEFAULT_JWT
}
