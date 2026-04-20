use anyhow::Error;
use axum::{
    extract::rejection::{JsonRejection, PathRejection, QueryRejection},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use sea_orm::DbErr;
use tracing::{debug, error, info, warn};

use crate::{
    data::ApiResponse,
    error::{
        auth_code::AuthErrorCode, critical_code::CriticalErrorCode,
        framework_code::FrameworkErrorCode,
    },
};

pub mod auth_code;
pub mod base_code;
pub mod critical_code;
pub mod framework_code;
pub mod third_party_code;

pub type ApiResult<T> = Result<T, ApiError>;

pub trait AppErrorCode: Send + Sync {
    fn code(&self) -> u32;
    fn message(&self) -> String;
}

#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("App error: {code}")]
    App {
        code: u32,
        message: String,
        extra_message: Option<String>,
        file: Option<String>,
        line: Option<u32>,
        error: Option<Error>,
    },
}

impl ApiError {
    pub fn from_app_error<T: AppErrorCode + Send + Sync + 'static>(err: T) -> Self {
        ApiError::App {
            code: err.code(),
            message: err.message(),
            extra_message: None,
            file: None,
            line: None,
            error: None,
        }
    }

    pub fn with_extra(self, extra: impl Into<String>) -> Self {
        match self {
            ApiError::App {
                code,
                message,
                extra_message: _,
                file,
                line,
                error,
            } => ApiError::App {
                code,
                message,
                extra_message: Some(extra.into()),
                file,
                line,
                error,
            },
        }
    }

    pub fn log(&self) {
        match self {
            ApiError::App {
                code,
                message,
                extra_message,
                file,
                line,
                error,
            } => {
                let c = code / 1_00000;
                match c {
                    5 => match extra_message {
                        Some(extra) => {
                            info!("[{}]{}: {}", code, message, extra);
                        }
                        None => {
                            info!("[{}]{}", code, message);
                        }
                    },
                    3 | 4 => match extra_message {
                        Some(extra) => {
                            warn!("[{}]{}: {}", code, message, extra);
                        }
                        None => {
                            warn!("[{}]{}", code, message);
                        }
                    },
                    _ => match extra_message {
                        Some(extra) => {
                            error!("[{}]{}: {}", code, message, extra);
                        }
                        None => {
                            error!("[{}]{}", code, message);
                        }
                    },
                };
                if let (Some(file), Some(line)) = (file, line) {
                    debug!("[{}]{} at {}:{}", code, message, file, line);
                }
                if let Some(error) = error {
                    error!("{:?}", error);
                }
            }
        };
    }

    pub fn gen_response(&self) -> Response {
        let (status_code, code, message) = match self {
            ApiError::App {
                code,
                message,
                extra_message: _,
                file: _,
                line: _,
                error: _,
            } => {
                let c = code / 1_00000;
                match c {
                    // Business
                    5 => (StatusCode::BAD_REQUEST, *code as i32, message.clone()),
                    3 | 4 => {
                        // Critical/framework
                        let code = *code;
                        if code == AuthErrorCode::TokenInvalid.code()
                            || code == AuthErrorCode::Unauthenticated.code()
                            || code == AuthErrorCode::AuthHeaderMissing.code()
                            || code == AuthErrorCode::AuthHeaderInvalid.code()
                            || code == AuthErrorCode::BearerRequired.code()
                        {
                            (
                                StatusCode::UNAUTHORIZED,
                                AuthErrorCode::Unauthenticated.code() as i32,
                                AuthErrorCode::Unauthenticated.message(),
                            )
                        } else if code == CriticalErrorCode::ResourceNotFound.code() {
                            (
                                StatusCode::NOT_FOUND,
                                CriticalErrorCode::ResourceNotFound.code() as i32,
                                CriticalErrorCode::ResourceNotFound.message(),
                            )
                        } else if code == FrameworkErrorCode::ValidationInvalid.code()
                            || code == FrameworkErrorCode::QueryInvalid.code()
                            || code == FrameworkErrorCode::PathInvalid.code()
                            || code == FrameworkErrorCode::JsonInvalid.code()
                            || code == FrameworkErrorCode::MethodNotAllowed.code()
                        {
                            (StatusCode::BAD_REQUEST, code as i32, message.clone())
                        } else {
                            (
                                StatusCode::INTERNAL_SERVER_ERROR,
                                CriticalErrorCode::InternalError.code() as i32,
                                CriticalErrorCode::InternalError.message(),
                            )
                        }
                    }
                    _ => (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        CriticalErrorCode::InternalError.code() as i32,
                        CriticalErrorCode::InternalError.message(),
                    ),
                }
            }
        };
        let body = axum::Json(ApiResponse::<()>::error(code, message));
        (status_code, body).into_response()
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        self.log();
        self.gen_response()
    }
}

impl From<ApiError> for Response {
    fn from(value: ApiError) -> Self {
        value.into_response()
    }
}

impl From<anyhow::Error> for ApiError {
    fn from(value: anyhow::Error) -> Self {
        let err = critical_code::CriticalErrorCode::InternalError;
        ApiError::App {
            code: err.code(),
            message: err.message(),
            extra_message: Some(value.to_string()),
            file: None,
            line: None,
            error: Some(value),
        }
    }
}

impl From<DbErr> for ApiError {
    fn from(value: DbErr) -> Self {
        let err = base_code::BaseErrorCode::Database;
        ApiError::App {
            code: err.code(),
            message: err.message(),
            extra_message: Some(value.to_string()),
            file: None,
            line: None,
            error: None,
        }
    }
}

impl From<QueryRejection> for ApiError {
    fn from(value: QueryRejection) -> Self {
        let err = framework_code::FrameworkErrorCode::QueryInvalid;
        ApiError::App {
            code: err.code(),
            message: err.message(),
            extra_message: Some(value.to_string()),
            file: None,
            line: None,
            error: None,
        }
    }
}

impl From<PathRejection> for ApiError {
    fn from(value: PathRejection) -> Self {
        let err = framework_code::FrameworkErrorCode::PathInvalid;
        ApiError::App {
            code: err.code(),
            message: err.message(),
            extra_message: Some(value.to_string()),
            file: None,
            line: None,
            error: None,
        }
    }
}

impl From<JsonRejection> for ApiError {
    fn from(value: JsonRejection) -> Self {
        let err = framework_code::FrameworkErrorCode::JsonInvalid;
        ApiError::App {
            code: err.code(),
            message: err.message(),
            extra_message: Some(value.to_string()),
            file: None,
            line: None,
            error: None,
        }
    }
}

impl From<bcrypt::BcryptError> for ApiError {
    fn from(value: bcrypt::BcryptError) -> Self {
        let err = third_party_code::ThirdPartyErrorCode::PasswordError;
        ApiError::App {
            code: err.code(),
            message: err.message(),
            extra_message: Some(value.to_string()),
            file: None,
            line: None,
            error: None,
        }
    }
}

impl From<axum_valid::ValidRejection<ApiError>> for ApiError {
    fn from(value: axum_valid::ValidRejection<ApiError>) -> Self {
        match value {
            axum_valid::ValidRejection::Valid(errors) => {
                let err = framework_code::FrameworkErrorCode::ValidationInvalid;
                ApiError::App {
                    code: err.code(),
                    message: err.message(),
                    extra_message: Some(errors.to_string()),
                    file: None,
                    line: None,
                    error: None,
                }
            }
            axum_valid::ValidRejection::Inner(errors) => errors,
        }
    }
}

#[macro_export]
#[doc(hidden)]
macro_rules! err {
    ($code:expr) => {{
        {
            let api_err = $crate::error::ApiError::from_app_error($code);
            let new_err = match api_err {
                $crate::error::ApiError::App {
                    code,
                    message,
                    extra_message,
                    file: _,
                    line: _,
                    error,
                } => $crate::error::ApiError::App {
                    code,
                    message: message.clone(),
                    extra_message,
                    file: Some(file!().to_string()),
                    line: Some(line!()),
                    error,
                },
            };
            new_err
        }
    }};
}
