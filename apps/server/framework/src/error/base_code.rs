use framework_macros::error;

#[error]
pub enum BaseErrorCode {
    Database = 101001,
}
