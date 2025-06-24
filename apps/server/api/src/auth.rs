use std::net::SocketAddr;

use axum::{
    Extension, debug_handler,
    extract::{ConnectInfo, State},
};
use common::password::verify;
use serde::{Deserialize, Serialize};
use service::AppState;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::{router::OpenApiRouter, routes};
use validator::Validate;

use super::config;

use crate::common::{
    auth::{Jwt, Principal},
    data::{
        ApiResponse,
        valid::{ValidJson, ValidQuery},
    },
    error::{ApiError, ApiResult},
    middleware::get_auth_layer,
};
use entity::{prelude::*, user};
use sea_orm::prelude::*;

const TAG: &str = "auth";

pub fn create_routes(state: AppState) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(user))
        .route_layer(get_auth_layer())
        .routes(routes!(access_token))
        .routes(routes!(login))
        .with_state(state)
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[schema(example = json!({"account": "root", "password": "Change_Me"}))]
pub struct LoginParam {
    #[validate(length(min = 4, max = 16, message = "account length between 4 - 16"))]
    account: String,
    #[validate(length(min = 6, max = 16, message = "password length between 6 - 16"))]
    password: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct LoginResult {
    access_token: String,
    expires_in: u64,
    refresh_token: String,
    refresh_token_expires_in: u64,
    scope: String,
    token_type: String,
}

#[debug_handler]
#[tracing::instrument(name="login",skip_all,fields(account = %param.account,ip = %addr))]
#[utoipa::path(post, path = "/auth/login",tag=TAG,security(()),request_body = LoginParam,responses(
    (status=OK,body=ApiResponse<LoginResult>)
))]
async fn login(
    State(AppState { conn }): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    ValidJson(param): ValidJson<LoginParam>,
) -> ApiResult<ApiResponse<LoginResult>> {
    let user = User::find()
        .filter(user::Column::Account.eq(&param.account))
        .one(&conn)
        .await?
        .ok_or_else(|| ApiError::Biz(String::from("Account or password not correct")))?;
    if !verify(&param.password, &user.password)? {
        return Err(ApiError::Biz(String::from(
            "Account or password not correct",
        )));
    }
    let principal = Principal {
        id: user.id,
        name: user.account,
    };
    let access_token = Jwt::global().access_token_encode(principal.clone())?;
    let expires_in = Jwt::global().access_token_expires_in();
    let refresh_token = Jwt::global().refresh_token_encode(principal.clone())?;
    let refresh_token_expires_in = Jwt::global().refresh_token_expires_in();
    tracing::info!("Login success");
    Ok(ApiResponse::success(Some(LoginResult {
        access_token,
        expires_in,
        refresh_token,
        refresh_token_expires_in,
        scope: String::from(""),
        token_type: String::from("bearer"),
    })))
}

#[derive(Debug, Deserialize, Validate, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct AccessTokenParam {
    #[param(example = "d1aicsr57dijo7h963ig")]
    client_id: String,
    #[param(example = "ujTgh2lEQYy0PXhK")]
    client_secret: String,
    #[param(example = "refresh_token")]
    grant_type: String,
    #[param(example = "")]
    refresh_token: String,
}

#[debug_handler]
#[tracing::instrument(name="access_token",skip_all,fields(param = %param.refresh_token,ip = %addr))]
#[utoipa::path(post, path = "/auth/access_token",tag=TAG,security(()),params(AccessTokenParam),responses(
    (status=OK,body=ApiResponse<LoginResult>)
))]
async fn access_token(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    ValidQuery(param): ValidQuery<AccessTokenParam>,
) -> ApiResult<ApiResponse<LoginResult>> {
    let auth = config::get().auth();
    if !param.client_id.eq(auth.client_id()) || !param.client_secret.eq(auth.client_secret()) {
        return Err(ApiError::Biz(String::from(
            "client_id or client_secret invalid",
        )));
    } else if !param.grant_type.eq("refresh_token") {
        return Err(ApiError::Biz(String::from(
            "grant_type must be refresh_token",
        )));
    } else {
        let refresh_token_principal = Jwt::global().refresh_token_decode(&param.refresh_token)?;
        let access_token = Jwt::global().access_token_encode(refresh_token_principal.clone())?;
        let expires_in = Jwt::global().access_token_expires_in();
        let refresh_token = Jwt::global().refresh_token_encode(refresh_token_principal.clone())?;
        let refresh_token_expires_in = Jwt::global().refresh_token_expires_in();
        tracing::info!("Login success");
        Ok(ApiResponse::success(Some(LoginResult {
            access_token,
            expires_in,
            refresh_token,
            refresh_token_expires_in,
            scope: String::from(""),
            token_type: String::from("bearer"),
        })))
    }
}

#[debug_handler]
#[utoipa::path(get, path = "/auth/user",tag=TAG,security(()),responses(
    (status=OK,body=ApiResponse<Principal>)
))]
async fn user(Extension(principal): Extension<Principal>) -> ApiResult<ApiResponse<Principal>> {
    Ok(ApiResponse::success(Some(principal)))
}
