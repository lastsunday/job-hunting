use api::setup_auth;
use api::setup_default;
use axum::extract::connect_info::MockConnectInfo;
use common::get_from_value;
use common::post_json;
use common::response_to_json;
use core::option::Option;
use cucumber::gherkin::Step;
use cucumber::then;
use cucumber::when;
use cucumber::{World, given};
use framework::auth::Jwt;
use framework::auth::Principal;
use futures::FutureExt;
use serde_json::json;
use service::AppState;
use std::net::SocketAddr;
use utoipa_axum::router::OpenApiRouter;
mod common;
use common::{setup_database, tear_down};
use testcontainers::ContainerAsync;
use testcontainers_modules::postgres::Postgres;

use axum::{Router, http::StatusCode};
use entity::{prelude::*, user};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

use crate::common::get_json_result;
use crate::common::get_json_with_token;
use crate::common::post_json_with_token;
use crate::common::post_json_without_body;

const LOGIN_API_URL: &str = "/api/auth/login";
const USER_API_URL: &str = "/api/auth/user";
const ACCESS_TOKEN_API_URL: &str = "/api/auth/access_token";
const RESET_PASSWORD_API_URL: &str = "/api/auth/reset_password";

#[given("含有预设的超级用户凭证信息")]
async fn auth_info(world: &mut TestWorld, step: &Step) {
    let mut result = Vec::new();
    if let Some(table) = step.table.as_ref() {
        for row in table.rows.iter().skip(1) {
            // NOTE: skip header
            let account: &String = &row[0];
            let password: &String = &row[1];
            result.push(UserItem {
                account: String::from(account),
                password: String::from(password),
            })
        }
    }
    world.users = result;
}

#[when(expr = "超级用户进行登录")]
async fn auth_login(world: &mut TestWorld) {
    let user = world.users.first().unwrap();
    let param_json = json!({"account":user.account,"password":user.password});
    let response = post_json(world.app.clone().unwrap(), LOGIN_API_URL, &param_json).await;
    assert_eq!(response.status(), StatusCode::OK);
    let data = get_json_result(&response_to_json(response).await);
    world.access_token = get_from_value(&data, "access_token").unwrap();
    world.expires_in = get_from_value(&data, "expires_in").unwrap();
    world.refresh_token = get_from_value(&data, "refresh_token").unwrap();
    world.refresh_token_expires_in = get_from_value(&data, "refresh_token_expires_in").unwrap();
    world.scope = get_from_value(&data, "scope").unwrap();
    world.token_type = get_from_value(&data, "token_type").unwrap();
}

#[then(expr = "超级用户应该能获得访问令牌")]
async fn get_access_token(world: &mut TestWorld) {
    assert!(!world.access_token.is_empty());
    assert_eq!(world.expires_in, 28800);
    assert!(!world.refresh_token.is_empty());
    assert_eq!(world.refresh_token_expires_in, 15897600);
    assert_eq!(world.scope, String::from(""));
    assert_eq!(world.token_type, String::from("bearer"));
}

#[given("超级用户的登录凭证")]
async fn give_root_access_token(world: &mut TestWorld) {
    let principal = Principal {
        id: String::from("testid"),
        name: String::from("root"),
    };
    let access_token = Jwt::global().access_token_encode(principal).unwrap();
    world.access_token = access_token;
}

#[when(expr = "超级用户进行个人信息查询")]
async fn root_get_user_info(world: &mut TestWorld) {
    let response = get_json_with_token(
        world.app.clone().unwrap(),
        USER_API_URL,
        Some(String::from(&world.access_token)),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let data = get_json_result(&response_to_json(response).await);
    world.name = get_from_value(&data, "name").unwrap();
}

#[then(expr = "超级用户应该能获得个人信息")]
async fn root_user_info(world: &mut TestWorld) {
    assert_eq!("root", world.name);
}

#[given("刷新令牌")]
async fn give_root_refresh_token(world: &mut TestWorld) {
    let principal = Principal {
        id: String::from("testid"),
        name: String::from("root"),
    };
    let refresh_token = Jwt::global().refresh_token_encode(principal).unwrap();
    world.refresh_token = refresh_token;
}

#[when(expr = "使用刷新令牌获取新的访问令牌和刷新令牌")]
async fn root_refresh_token(world: &mut TestWorld) {
    let response = post_json_without_body(
        world.app.clone().unwrap(),
        format!("{}?client_id=d1aicsr57dijo7h963ig&client_secret=ujTgh2lEQYy0PXhK&grant_type=refresh_token&refresh_token={}",ACCESS_TOKEN_API_URL,world.refresh_token).as_str(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let data = get_json_result(&response_to_json(response).await);
    world.access_token = get_from_value(&data, "access_token").unwrap();
    world.refresh_token = get_from_value(&data, "refresh_token").unwrap();
}

#[then(expr = "获得刷新后的访问令牌和刷新令牌")]
async fn root_access_token_and_refresh_token_get(world: &mut TestWorld) {
    assert!(!world.access_token.is_empty());
    assert!(!world.refresh_token.is_empty());
}

#[given("超级用户访问令牌和用户凭证信息")]
async fn give_root_access_token_and_user_info(world: &mut TestWorld, step: &Step) {
    let mut result = Vec::new();
    if let Some(table) = step.table.as_ref() {
        for row in table.rows.iter().skip(1) {
            // NOTE: skip header
            let account: &String = &row[0];
            let password: &String = &row[1];
            result.push(UserItem {
                account: String::from(account),
                password: String::from(password),
            })
        }
    }
    world.users = result.clone();
    let conn = world.state.as_ref().unwrap().conn.clone();
    let user = User::find()
        .filter(user::Column::Account.eq(result.first().unwrap().account.clone()))
        .one(&conn)
        .await
        .unwrap();
    let principal = Principal {
        id: user.unwrap().id,
        name: result.first().unwrap().account.clone(),
    };
    let access_token = Jwt::global().access_token_encode(principal).unwrap();
    world.access_token = access_token;
}

#[when(expr = "使用原密码和新密码进行密码修改")]
async fn reset_password(world: &mut TestWorld) {
    let old_password = world.users.first().unwrap().password.clone();
    let new_password = "Change_It";
    let param_json = json!({"password":new_password,"old_password":old_password});
    let response = post_json_with_token(
        world.app.clone().unwrap(),
        RESET_PASSWORD_API_URL,
        &param_json,
        Some(world.access_token.clone()),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    world.new_password = String::from(new_password);
}

#[then(expr = "可以使用新密码进行登录")]
async fn login_success_use_new_password(world: &mut TestWorld) {
    let account = world.users.first().unwrap().account.clone();
    let password = world.new_password.clone();
    let param_json = json!({"account":account,"password":password});
    let response = post_json(world.app.clone().unwrap(), LOGIN_API_URL, &param_json).await;
    assert_eq!(response.status(), StatusCode::OK);
}

#[derive(Debug, Default, Clone)]
struct UserItem {
    pub account: String,
    pub password: String,
}

#[derive(Debug, Default, World)]
pub struct TestWorld {
    users: Vec<UserItem>,
    access_token: String,
    expires_in: u64,
    refresh_token: String,
    refresh_token_expires_in: u64,
    scope: String,
    token_type: String,
    name: String,
    new_password: String,
    container: Option<ContainerAsync<Postgres>>,
    app: Option<Router>,
    state: Option<AppState>,
}

#[tokio::test]
async fn main() {
    TestWorld::cucumber()
        .before(|_feature, _rule, _scenario, world| {
            async move {
                let (container, state) = setup_database().await;
                world.container = container;
                world.state = Some(state.clone());
                Jwt::init(api::config::get().auth().clone());
                let app = OpenApiRouter::new();
                let app = setup_auth(app, state).split_for_parts().0;
                let app = setup_default(app);
                let app = app.layer(MockConnectInfo(SocketAddr::from(([0, 0, 0, 0], 1337))));
                world.app = Some(app);
            }
            .boxed()
        })
        .after(|_feature, _rule, _scenario, _ev, world| {
            async move {
                if let Some(world) = world.as_ref() {
                    tear_down(&world.container).await;
                }
            }
            .boxed()
        })
        .run("tests/features/auth/auth.feature")
        .await;
}
