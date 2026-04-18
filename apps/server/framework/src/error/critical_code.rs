use framework_macros::error;

#[error]
pub enum CriticalErrorCode {
    InternalError = 301001,
    ResourceNotFound = 301002,
}
