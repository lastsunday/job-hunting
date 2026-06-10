use framework_macros::error;

#[error]
pub enum FrameworkErrorCode {
    ValidationInvalid = 301001,
    QueryInvalid = 301002,
    PathInvalid = 301003,
    JsonInvalid = 301004,
    MethodNotAllowed = 301005,
}
