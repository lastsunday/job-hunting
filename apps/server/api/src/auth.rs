use std::net::SocketAddr;

use axum::{
    Extension, debug_handler,
    extract::{ConnectInfo, State},
};
use common::password::verify;
use serde::{Deserialize, Serialize};
use service::AppState;
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};
use validator::Validate;

use crate::common::{
    auth::{Principal, get_jwt},
    data::{ApiResponse, valid::ValidJson},
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
#[serde(rename_all = "camelCase")]
pub struct LoginResult {
    access_token: String,
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
    let access_token = get_jwt().encode(principal)?;
    tracing::info!("Login success");
    Ok(ApiResponse::success(Some(LoginResult { access_token })))
}

#[debug_handler]
#[utoipa::path(get, path = "/auth/user",tag=TAG,security(()),responses(
    (status=OK,body=ApiResponse<Principal>)
))]
async fn user(Extension(principal): Extension<Principal>) -> ApiResult<ApiResponse<Principal>> {
    Ok(ApiResponse::success(Some(principal)))
}
