use axum::{Router, debug_handler, routing::get};
use serde::{Deserialize, Serialize};
use validator::Validate;

use crate::common::{
    data::{ApiResponse, PageParam, valid::ValidQuery},
    error::ApiResult,
};

pub fn routes() -> Router {
    Router::new()
        .route("/hello", get(root))
        .route("/version", get(version))
        .route("/testPathQuery", get(test_path_query))
}

#[debug_handler]
pub async fn root() -> &'static str {
    "Hello, World!"
}

pub async fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[derive(Default, Deserialize, Serialize, Debug, Clone, Validate)]
#[serde(rename_all = "camelCase")]
pub struct TestQueryParam {
    #[validate(nested)]
    #[serde(flatten)]
    pub page: PageParam,
}

#[debug_handler]
pub async fn test_path_query(
    ValidQuery(param): ValidQuery<TestQueryParam>,
) -> ApiResult<ApiResponse<TestQueryParam>> {
    Ok(ApiResponse::success(Some(param)))
}
