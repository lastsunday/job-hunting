use framework_macros::error;

#[error]
pub enum AuthErrorCode {
    Unauthenticated = 302001,
    AuthHeaderMissing = 302002,
    AuthHeaderInvalid = 302003,
    BearerRequired = 302004,
    TokenInvalid = 302005,
}
