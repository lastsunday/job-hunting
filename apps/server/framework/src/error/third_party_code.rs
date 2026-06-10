use framework_macros::error;

#[error]
pub enum ThirdPartyErrorCode {
    JwtError = 201001,
    PasswordError = 201002,
}
