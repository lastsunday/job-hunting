use super::data::ApiResponse;
pub use super::error_code::FrameworkErrorCode;
use axum::extract::rejection::{JsonRejection, PathRejection, QueryRejection};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum_valid::ValidRejection;
use bcrypt::BcryptError;
use jsonwebtoken::errors::Error;

pub type ApiResult<T> = Result<T, ApiError>;

pub trait AppErrorCode: Send + Sync {
    fn code(&self) -> u32;
    fn i18n_key(&self) -> &'static str;
}

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
    #[error("Bcrypt error: {0}")]
    Bcrypt(#[from] BcryptError),
    #[error("{0}")]
    Biz(String),
    #[error("Error: {0}")]
    Internal(#[from] anyhow::Error),
    #[error("App error: {i18n_key} ({code})")]
    App { code: u32, i18n_key: &'static str },
    #[error("{0}")]
    Framework(#[from] FrameworkErrorCode),
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
    pub fn from_app_error<T: AppErrorCode + Send + Sync + 'static>(err: T) -> Self {
        ApiError::App {
            code: err.code(),
            i18n_key: err.i18n_key(),
        }
    }

    pub fn i18n_key(&self) -> &'static str {
        match self {
            ApiError::App { i18n_key, .. } => i18n_key,
            ApiError::Framework(e) => e.i18n_key(),
            ApiError::NotFound => FrameworkErrorCode::ResourceNotFound.i18n_key(),
            ApiError::MethodNotAllowed => FrameworkErrorCode::MethodNotAllowed.i18n_key(),
            ApiError::Database(_) | ApiError::Internal(_) | ApiError::Bcrypt(_) => {
                FrameworkErrorCode::InternalError.i18n_key()
            }
            ApiError::Query(_) | ApiError::Path(_) | ApiError::Json(_) => {
                FrameworkErrorCode::QueryInvalid.i18n_key()
            }
            ApiError::Validation(_) => FrameworkErrorCode::ValidationInvalid.i18n_key(),
            ApiError::Jwt(_) => FrameworkErrorCode::JwtError.i18n_key(),
            ApiError::Biz(_) => "",
        }
    }

    pub fn code(&self) -> u32 {
        match self {
            ApiError::App { code, .. } => *code,
            ApiError::Framework(e) => (*e) as u32,
            ApiError::NotFound => FrameworkErrorCode::ResourceNotFound as u32,
            ApiError::MethodNotAllowed => FrameworkErrorCode::MethodNotAllowed as u32,
            ApiError::Database(_) | ApiError::Internal(_) | ApiError::Bcrypt(_) => {
                FrameworkErrorCode::InternalError as u32
            }
            ApiError::Query(_) | ApiError::Path(_) | ApiError::Json(_) => {
                FrameworkErrorCode::QueryInvalid as u32
            }
            ApiError::Validation(_) => FrameworkErrorCode::ValidationInvalid as u32,
            ApiError::Jwt(_) => FrameworkErrorCode::JwtError as u32,
            ApiError::Biz(_) => 0,
        }
    }

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
            ApiError::Jwt(_) => StatusCode::UNAUTHORIZED,
            ApiError::Biz(_) | ApiError::App { .. } => StatusCode::OK,
            ApiError::Framework(e) => match e {
                FrameworkErrorCode::ResourceNotFound => StatusCode::NOT_FOUND,
                FrameworkErrorCode::MethodNotAllowed => StatusCode::METHOD_NOT_ALLOWED,
                FrameworkErrorCode::InternalError
                | FrameworkErrorCode::DbError
                | FrameworkErrorCode::PasswordError => StatusCode::INTERNAL_SERVER_ERROR,
                FrameworkErrorCode::JwtError => StatusCode::UNAUTHORIZED,
                _ => StatusCode::BAD_REQUEST,
            },
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let state_code = self.status_code();
        let i18n_key = self.i18n_key();
        let body = if !i18n_key.is_empty() {
            let message = i18n::translate(i18n_key);
            axum::Json(ApiResponse::<()>::error(self.code() as i32, message))
        } else {
            axum::Json(ApiResponse::<()>::failure(self.to_string()))
        };
        (state_code, body).into_response()
    }
}

impl From<ApiError> for Response {
    fn from(value: ApiError) -> Self {
        value.into_response()
    }
}
