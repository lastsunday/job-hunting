use framework_macros::error;

#[error]
pub enum CriticalErrorCode {
    InternalError = 401001,
    ResourceNotFound = 401002,
}
