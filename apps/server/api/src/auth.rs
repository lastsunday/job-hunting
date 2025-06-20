use std::net::SocketAddr;

use axum::{
    Extension, Router, debug_handler,
    extract::{ConnectInfo, State},
    routing::{get, post},
};
use common::password::verify;
use serde::{Deserialize, Serialize};
use service::AppState;
use validator::Validate;

use crate::common::{
    auth::{Principal, get_jwt},
    data::{ApiResponse, valid::ValidJson},
    error::{ApiError, ApiResult},
    middleware::get_auth_layer,
};
use entity::{prelude::*, user};
use sea_orm::prelude::*;

pub fn routes(state: AppState) -> Router {
    Router::new().nest(
        "/auth",
        Router::new()
            .route("/user", get(user))
            .route_layer(get_auth_layer())
            .route("/login", post(login))
            .with_state(state),
    )
}

#[derive(Debug, Deserialize, Validate)]
pub struct LoginParam {
    #[validate(length(min = 4, max = 16, message = "account length between 4 - 16"))]
    account: String,
    #[validate(length(min = 6, max = 16, message = "password length between 6 - 16"))]
    password: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResult {
    access_token: String,
}

#[debug_handler]
#[tracing::instrument(name="login",skip_all,fields(account = %param.account,ip = %addr))]
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
    let access_token = get_jwt().encode(principal)?;
    tracing::info!("Login success");
    Ok(ApiResponse::success(Some(LoginResult { access_token })))
}

#[debug_handler]
async fn user(Extension(principal): Extension<Principal>) -> ApiResult<ApiResponse<Principal>> {
    Ok(ApiResponse::success(Some(principal)))
}
