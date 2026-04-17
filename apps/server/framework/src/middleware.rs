use std::{pin::Pin, sync::LazyLock};

use axum::{body::Body, extract::Request, http::Response, http::header, middleware::Next};
use tower_http::auth::{AsyncAuthorizeRequest, AsyncRequireAuthorizationLayer};

use crate::{auth::Jwt, error::{ApiError, FrameworkErrorCode}, i18n};

static AUTH_LAYER_INSTANCE: LazyLock<AsyncRequireAuthorizationLayer<JwtAuth>> =
    LazyLock::new(|| AsyncRequireAuthorizationLayer::new(JwtAuth::new(Jwt::global())));

#[derive(Clone)]
pub struct JwtAuth {
    jwt: &'static Jwt,
}

impl JwtAuth {
    pub fn new(jwt: &'static Jwt) -> Self {
        Self { jwt }
    }
}

impl AsyncAuthorizeRequest<Body> for JwtAuth {
    type RequestBody = Body;

    type ResponseBody = Body;

    type Future = Pin<
        Box<
            dyn Future<Output = Result<Request<Self::RequestBody>, Response<Self::ResponseBody>>>
                + Send
                + 'static,
        >,
    >;

    fn authorize(&mut self, mut request: Request<Body>) -> Self::Future {
        let jwt = self.jwt;
        Box::pin(async move {
            let token = request
                .headers()
                .get(header::AUTHORIZATION)
                .map(|value| -> Result<_, ApiError> {
                    let token = value
                        .to_str()
                        .map_err(|_| ApiError::Framework(FrameworkErrorCode::AuthHeaderInvalid))?
                        .strip_prefix("Bearer ")
                        .ok_or(ApiError::Framework(FrameworkErrorCode::BearerRequired))?;
                    Ok(token)
                })
                .transpose()?
                .ok_or(ApiError::Framework(FrameworkErrorCode::AuthHeaderMissing))?;
            let pricipal = jwt
                .access_token_decode(token)
                .map_err(|_| ApiError::Framework(FrameworkErrorCode::TokenInvalid))?;
            request.extensions_mut().insert(pricipal);
            Ok(request)
        })
    }
}

pub fn get_auth_layer() -> &'static AsyncRequireAuthorizationLayer<JwtAuth> {
    &AUTH_LAYER_INSTANCE
}

pub async fn extract_language(request: Request, next: Next) -> Response<Body> {
    let locale = request
        .headers()
        .get(header::ACCEPT_LANGUAGE)
        .and_then(|v| v.to_str().ok())
        .map(|v| extract_primary_language(v))
        .unwrap_or("en");

    i18n::set_locale(locale);

    next.run(request).await
}

fn extract_primary_language(accept_language: &str) -> &str {
    let first = accept_language.split(',').next().unwrap_or("en");
    let lang = first.split(';').next().unwrap_or("en").trim();
    if lang.starts_with("zh") {
        "zh"
    } else {
        "en"
    }
}
