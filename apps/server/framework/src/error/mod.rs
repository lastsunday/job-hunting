use axum::{
    extract::rejection::{JsonRejection, PathRejection, QueryRejection},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use i18n::translate;
use sea_orm::DbErr;
use tracing::{error, info, warn};

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
    fn i18n_key(&self) -> &'static str;
    fn message(&self) -> Option<String>;
}

#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("App error: {i18n_key} ({code})")]
    App {
        code: u32,
        i18n_key: &'static str,
        message: Option<String>,
    },
}

impl ApiError {
    pub fn from_app_error<T: AppErrorCode + Send + Sync + 'static>(err: T) -> Self {
        ApiError::App {
            code: err.code(),
            i18n_key: err.i18n_key(),
            message: err.message(),
        }
    }

    pub fn log(&self) {
        match self {
            ApiError::App {
                code,
                i18n_key,
                message,
            } => {
                let c = code / 1_00000;
                match c {
                    5 => {
                        //Business
                        info!("{}({})-{:?}", code, translate(i18n_key), message);
                    }
                    3 | 4 => {
                        //Critical/framework
                        match message {
                            Some(message) => {
                                warn!("{}({}):{}", code, translate(i18n_key), message);
                            }
                            None => {
                                warn!("{}({})", code, translate(i18n_key));
                            }
                        }
                    }
                    _ => match message {
                        Some(message) => {
                            error!("{}({}):{}", code, translate(i18n_key), message);
                        }
                        None => {
                            error!("{}({})", code, translate(i18n_key));
                        }
                    },
                };
            }
        };
    }

    pub fn gen_response(&self) -> Response {
        let (status_code, code, i18n_key) = match self {
            ApiError::App {
                code,
                i18n_key,
                message: _,
            } => {
                let c = code / 1_00000;
                match c {
                    //Business
                    5 => (StatusCode::OK, *code as i32, *i18n_key),
                    3 | 4 => {
                        //Critical/framework
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
                                AuthErrorCode::Unauthenticated.i18n_key(),
                            )
                        } else if code == CriticalErrorCode::ResourceNotFound.code() {
                            (
                                StatusCode::NOT_FOUND,
                                CriticalErrorCode::ResourceNotFound.code() as i32,
                                CriticalErrorCode::ResourceNotFound.i18n_key(),
                            )
                        } else if code == FrameworkErrorCode::ValidationInvalid.code()
                            || code == FrameworkErrorCode::QueryInvalid.code()
                            || code == FrameworkErrorCode::PathInvalid.code()
                            || code == FrameworkErrorCode::JsonInvalid.code()
                            || code == FrameworkErrorCode::MethodNotAllowed.code()
                        {
                            (StatusCode::BAD_REQUEST, code as i32, *i18n_key)
                        } else {
                            (
                                StatusCode::INTERNAL_SERVER_ERROR,
                                CriticalErrorCode::InternalError.code() as i32,
                                CriticalErrorCode::InternalError.i18n_key(),
                            )
                        }
                    }
                    _ => (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        CriticalErrorCode::InternalError.code() as i32,
                        CriticalErrorCode::InternalError.i18n_key(),
                    ),
                }
            }
        };
        let message = i18n::translate(i18n_key);
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
            i18n_key: err.i18n_key(),
            message: Some(value.to_string()),
        }
    }
}

impl From<DbErr> for ApiError {
    fn from(value: DbErr) -> Self {
        let err = base_code::BaseErrorCode::Database;
        ApiError::App {
            code: err.code(),
            i18n_key: err.i18n_key(),
            message: Some(value.to_string()),
        }
    }
}

impl From<QueryRejection> for ApiError {
    fn from(value: QueryRejection) -> Self {
        let err = framework_code::FrameworkErrorCode::QueryInvalid;
        ApiError::App {
            code: err.code(),
            i18n_key: err.i18n_key(),
            message: Some(value.to_string()),
        }
    }
}

impl From<PathRejection> for ApiError {
    fn from(value: PathRejection) -> Self {
        let err = framework_code::FrameworkErrorCode::PathInvalid;
        ApiError::App {
            code: err.code(),
            i18n_key: err.i18n_key(),
            message: Some(value.to_string()),
        }
    }
}

impl From<JsonRejection> for ApiError {
    fn from(value: JsonRejection) -> Self {
        let err = framework_code::FrameworkErrorCode::JsonInvalid;
        ApiError::App {
            code: err.code(),
            i18n_key: err.i18n_key(),
            message: Some(value.to_string()),
        }
    }
}

impl From<bcrypt::BcryptError> for ApiError {
    fn from(value: bcrypt::BcryptError) -> Self {
        let err = third_party_code::ThirdPartyErrorCode::JwtError;
        ApiError::App {
            code: err.code(),
            i18n_key: err.i18n_key(),
            message: Some(value.to_string()),
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
                    i18n_key: err.i18n_key(),
                    message: Some(errors.to_string()),
                }
            }
            axum_valid::ValidRejection::Inner(errors) => errors,
        }
    }
}
