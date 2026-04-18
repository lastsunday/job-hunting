use framework_macros::error;

#[error]
pub enum FrameworkErrorCode {
    ValidationInvalid = 401001,
    QueryInvalid = 401002,
    PathInvalid = 401003,
    JsonInvalid = 401004,
    MethodNotAllowed = 401005,
}
