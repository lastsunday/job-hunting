use std::{pin::Pin, sync::LazyLock};

use axum::{body::Body, extract::Request, http::Response, http::header};
use tower_http::auth::{AsyncAuthorizeRequest, AsyncRequireAuthorizationLayer};

use crate::{auth::Jwt, error::ApiError};

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
                        .map_err(|_| {
                            ApiError::Unauthenticated(String::from(
                                "Authorization not valid string",
                            ))
                        })?
                        .strip_prefix("Bearer ")
                        .ok_or_else(|| {
                            ApiError::Unauthenticated(String::from(
                                "Authorization must start with Bearer",
                            ))
                        })?;
                    Ok(token)
                })
                .transpose()?
                .ok_or_else(|| {
                    ApiError::Unauthenticated(String::from("Authorization header must exists"))
                })?;
            let pricipal = jwt
                .access_token_decode(token)
                .map_err(|err| -> ApiError { ApiError::Unauthenticated(format!("{:?}", err)) })?;
            request.extensions_mut().insert(pricipal);
            Ok(request)
        })
    }
}

pub fn get_auth_layer() -> &'static AsyncRequireAuthorizationLayer<JwtAuth> {
    &AUTH_LAYER_INSTANCE
}
