pub mod json;
pub mod path;
pub mod query;
pub mod serder;
pub mod valid;

use axum::response::IntoResponse;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::Validate;

pub use serder::{deserialize_number, empty_string_as_none};

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ApiResponse<T> {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
}

impl<T> ApiResponse<T> {
    pub fn new(code: i32, message: String, data: Option<T>) -> Self {
        Self {
            code,
            message,
            data,
        }
    }

    pub fn success(data: Option<T>) -> Self {
        Self::new(0, String::new(), data)
    }

    pub fn error<M: AsRef<str>>(code: i32, message: M) -> Self {
        Self::new(code, String::from(message.as_ref()), None)
    }

    pub fn failure<M: AsRef<str>>(message: M) -> Self {
        Self::new(-1, String::from(message.as_ref()), None)
    }
}

impl<T: Serialize> IntoResponse for ApiResponse<T> {
    fn into_response(self) -> axum::response::Response {
        axum::Json(self).into_response()
    }
}

const DEFAULT_PAGE_NUM: u64 = 1;
const DEFAULT_PAGE_SIZE: u64 = 10;

#[derive(Default, Deserialize, Serialize, Debug, Clone, PartialEq, Eq, Validate, ToSchema)]
#[schema(example = json!({"num": DEFAULT_PAGE_NUM, "size": DEFAULT_PAGE_SIZE}))]
pub struct PageParam {
    #[serde(default = "default_page_num", deserialize_with = "deserialize_number")]
    #[validate(range(min = 1, message = "page must more than 0"))]
    pub num: u64,
    #[serde(default = "default_page_size", deserialize_with = "deserialize_number")]
    #[validate(range(min = 1, max = 1000, message = "size must between 0 and 1000"))]
    pub size: u64,
}

fn default_page_num() -> u64 {
    DEFAULT_PAGE_NUM
}
fn default_page_size() -> u64 {
    DEFAULT_PAGE_SIZE
}

#[derive(Default, Deserialize, Serialize, Debug, Clone, PartialEq, Eq, ToSchema)]
pub struct ApiPageResult<T> {
    pub items: Vec<T>,
    pub total: u64,
}

impl<T> ApiPageResult<T> {
    pub fn new(items: Vec<T>, total: u64) -> Self {
        Self { items, total }
    }
}
