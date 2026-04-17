use thiserror::Error;

#[derive(Debug, Error)]
pub enum ImportError {
    #[error("File is empty")]
    FileEmpty,

    #[error("Failed to parse Excel: {0}")]
    ExcelParseFailed(String),

    #[error("Excel headers invalid, expected: {expected:?}, actual: {actual:?}")]
    ExcelHeadersInvalid {
        expected: Vec<String>,
        actual: Vec<String>,
    },

    #[error("No valid sheets found in workbook")]
    NoSheetsFound,

    #[error("Data type invalid: {0}")]
    DataTypeInvalid(String),

    #[error("Database error: {0}")]
    Database(String),
}

impl From<sea_orm::DbErr> for ImportError {
    fn from(err: sea_orm::DbErr) -> Self {
        ImportError::Database(err.to_string())
    }
}
