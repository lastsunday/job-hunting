use super::data::ApiResponse;
use axum::extract::rejection::{JsonRejection, PathRejection, QueryRejection};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum_valid::ValidRejection;
use bcrypt::BcryptError;
use jsonwebtoken::errors::Error;

pub type ApiResult<T> = Result<T, ApiError>;

#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("Not Found")]
    NotFound,
    #[error("Method not allowed")]
    MethodNotAllowed,
    #[error("Database error: {0}")]
    Database(#[from] sea_orm::DbErr),
    #[error("Query param invalid: {0}")]
    Query(#[from] QueryRejection),
    #[error("Path invalid: {0}")]
    Path(#[from] PathRejection),
    #[error("Body parse error: {0}")]
    Json(#[from] JsonRejection),
    #[error("Param invalid: {0}")]
    Validation(String),
    #[error("JWT error: {0}")]
    Jwt(#[from] Error),
    #[error("Unauthenticated: {0}")]
    Unauthenticated(String),
    #[error("Bcrypt error: {0}")]
    Bcrypt(#[from] BcryptError),
    #[error("{0}")]
    Biz(String),
    #[error("Error: {0}")]
    Internal(#[from] anyhow::Error),
}

impl From<axum_valid::ValidRejection<ApiError>> for ApiError {
    fn from(value: axum_valid::ValidRejection<ApiError>) -> Self {
        match value {
            ValidRejection::Valid(errors) => ApiError::Validation(errors.to_string()),
            ValidRejection::Inner(errors) => errors,
        }
    }
}

impl ApiError {
    pub fn status_code(&self) -> StatusCode {
        match self {
            ApiError::NotFound => StatusCode::NOT_FOUND,
            ApiError::MethodNotAllowed => StatusCode::METHOD_NOT_ALLOWED,
            ApiError::Internal(_) | ApiError::Database(_) | ApiError::Bcrypt(_) => {
                StatusCode::INTERNAL_SERVER_ERROR
            }
            ApiError::Query(_)
            | ApiError::Path(_)
            | ApiError::Json(_)
            | ApiError::Validation(_) => StatusCode::BAD_REQUEST,
            ApiError::Jwt(_) | ApiError::Unauthenticated(_) => StatusCode::UNAUTHORIZED,
            ApiError::Biz(_) => StatusCode::OK,
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let state_code = self.status_code();
        let body = axum::Json(ApiResponse::<()>::failure(self.to_string()));
        (state_code, body).into_response()
    }
}

impl From<ApiError> for Response {
    fn from(value: ApiError) -> Self {
        value.into_response()
    }
}
