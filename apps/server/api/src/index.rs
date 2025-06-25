use axum::debug_handler;
use chrono::Local;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};
use validator::Validate;

use framework::{
    data::{ApiResponse, PageParam, valid::ValidQuery},
    error::ApiResult,
};

const TAG: &str = "index";

pub fn create_routes() -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(hello))
        .routes(routes!(version))
        .routes(routes!(datetime))
        .routes(routes!(test_path_query))
}

#[debug_handler]
#[utoipa::path(get, path = "/hello", tag=TAG,security(()),responses(
    (status=OK,body=&'static str)
))]
pub async fn hello() -> &'static str {
    "Hello, World!"
}

#[debug_handler]
#[utoipa::path(get, path = "/version",tag=TAG,security(()),responses(
    (status=OK,body=&'static str)
))]
pub async fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[debug_handler]
#[utoipa::path(get, path = "/datetime",tag=TAG,security(()),responses(
    (status=OK,body=String)
))]
pub async fn datetime() -> String {
    Local::now().to_rfc3339()
}

#[derive(Default, Deserialize, Serialize, Debug, Clone, Validate, ToSchema)]
pub struct TestQueryParam {
    #[validate(nested)]
    #[serde(flatten)]
    pub page: PageParam,
}

#[debug_handler]
#[utoipa::path(get, path = "/testPathQuery",tag=TAG,security(()),request_body=TestQueryParam,responses(
    (status = OK,body=TestQueryParam)
))]
pub async fn test_path_query(
    ValidQuery(param): ValidQuery<TestQueryParam>,
) -> ApiResult<ApiResponse<TestQueryParam>> {
    Ok(ApiResponse::success(Some(param)))
}
