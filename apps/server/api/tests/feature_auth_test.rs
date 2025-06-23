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

use crate::common::get_json_result;
use crate::common::get_json_with_token;

use api::common::auth::{Principal, get_jwt};

const LOGIN_API_URL: &str = "/api/auth/login";
const USER_API_URL: &str = "/api/auth/user";

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
    world.access_token = get_from_value(&data, "accessToken").unwrap();
}

#[then(expr = "超级用户应该能获得访问令牌")]
async fn get_access_token(world: &mut TestWorld) {
    assert!(!world.access_token.is_empty())
}

#[given("超级用户的登录凭证")]
async fn give_root_access_token(world: &mut TestWorld) {
    let principal = Principal {
        id: String::from("testid"),
        name: String::from("root"),
    };
    let access_token = get_jwt().encode(principal).unwrap();
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

#[derive(Debug, Default)]
struct UserItem {
    pub account: String,
    pub password: String,
}

#[derive(Debug, Default, World)]
pub struct TestWorld {
    users: Vec<UserItem>,
    access_token: String,
    name: String,
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
