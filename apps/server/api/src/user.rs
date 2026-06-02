use std::net::SocketAddr;

use axum::{
    Extension, debug_handler,
    extract::{ConnectInfo, State},
};
use framework::{
    auth::{Jwt, Principal},
    data::{
        ApiResponse,
        valid::{ValidJson, ValidQuery},
    },
    error::ApiResult,
    middleware::get_auth_layer,
    password::{hash, verify},
};
use serde::{Deserialize, Serialize};
use crate::state::AppState;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::{router::OpenApiRouter, routes};
use validator::Validate;

use framework::prelude::*;

#[error]
pub enum UserErrorCode {
    Invalid = 503001,
    ClientInvalid = 503002,
    GrantInvalid = 503003,
    AccountNotFound = 503004,
    OldPasswordIncorrect = 503005,
}

use entity::{prelude::*, user};
use sea_orm::{ActiveValue::Set, prelude::*};

const TAG: &str = "auth";

pub fn create_routes(state: AppState) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(get_current_user))
        .routes(routes!(reset_password))
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
    State(AppState { conn, .. }): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    ValidJson(param): ValidJson<LoginParam>,
) -> ApiResult<ApiResponse<LoginResult>> {
    let user = User::find()
        .filter(user::Column::Account.eq(&param.account))
        .one(&conn)
        .await?
        .ok_or(err!(UserErrorCode::Invalid))?;
    if !verify(&param.password, &user.password)? {
        return Err(err!(UserErrorCode::Invalid));
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
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    ValidQuery(param): ValidQuery<AccessTokenParam>,
) -> ApiResult<ApiResponse<LoginResult>> {
    if param.client_id != state.auth_client_id || param.client_secret != state.auth_client_secret {
        return Err(err!(UserErrorCode::ClientInvalid));
    } else if !param.grant_type.eq("refresh_token") {
        return Err(err!(UserErrorCode::GrantInvalid));
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

#[derive(Default, Deserialize, Serialize, Debug, Clone, Validate, ToSchema)]
pub struct ResetPasswordParam {
    #[validate(length(min = 6, max = 16, message = "password length must bewteen 6 - 16"))]
    pub password: String,
    #[validate(length(min = 6, max = 16, message = "password length must bewteen 6 - 16"))]
    pub old_password: String,
}

#[debug_handler]
#[utoipa::path(post, path = "/auth/reset_password",tag=TAG,security(()),request_body = ResetPasswordParam,responses(
    (status=OK,body=ApiResponse<String>)
))]
async fn reset_password(
    State(AppState { conn, .. }): State<AppState>,
    Extension(principal): Extension<Principal>,
    ValidJson(param): ValidJson<ResetPasswordParam>,
) -> ApiResult<ApiResponse<()>> {
    let user = User::find()
        .filter(user::Column::Id.eq(principal.id.clone()))
        .one(&conn)
        .await?
        .ok_or(err!(UserErrorCode::AccountNotFound))?;
    if !verify(&param.old_password, &user.password)? {
        return Err(err!(UserErrorCode::OldPasswordIncorrect));
    }
    let hash_password = hash(param.password.as_str())?;
    let model = user::ActiveModel {
        id: Set(principal.id),
        password: Set(hash_password),
        ..Default::default()
    };
    User::update(model).exec(&conn).await?;
    Ok(ApiResponse::success(None))
}

#[debug_handler]
#[utoipa::path(get, path = "/auth/user",tag=TAG,security(()),responses(
    (status=OK,body=ApiResponse<Principal>)
))]
async fn get_current_user(Extension(principal): Extension<Principal>) -> ApiResult<ApiResponse<Principal>> {
    Ok(ApiResponse::success(Some(principal)))
}
