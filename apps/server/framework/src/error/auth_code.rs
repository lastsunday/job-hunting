use framework_macros::error;

#[error]
pub enum AuthErrorCode {
    Unauthenticated = 402001,
    AuthHeaderMissing = 402002,
    AuthHeaderInvalid = 402003,
    BearerRequired = 402004,
    TokenInvalid = 402005,
}
