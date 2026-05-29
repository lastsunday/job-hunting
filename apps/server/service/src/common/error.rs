use thiserror::Error;

#[derive(Debug, Error)]
pub enum FileError {
    #[error("File is empty")]
    FileEmpty,

    #[error("Failed to parse Excel: {0}")]
    ExcelParseFailed(String),

    #[error("No valid sheets found in workbook")]
    NoSheetsFound,

    #[error("Data type invalid: {0}")]
    DataTypeInvalid(String),

    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}
