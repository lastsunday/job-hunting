use framework_macros::error;

#[error]
pub enum FrameworkErrorCode {
    QueryInvalid = 101001,
    PathInvalid = 102001,
    JsonInvalid = 103001,
    ValidationInvalid = 104001,
    MethodNotAllowed = 105001,
    DbError = 106001,
    JwtError = 201001,
    PasswordError = 202001,
    InternalError = 301001,
    ResourceNotFound = 301002,
    Unauthenticated = 302001,
    AuthHeaderMissing = 302002,
    AuthHeaderInvalid = 302003,
    BearerRequired = 302004,
    TokenInvalid = 302005,
}

impl std::error::Error for FrameworkErrorCode {}
