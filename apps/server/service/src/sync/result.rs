use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(tag = "error_type")]
pub enum RowValidationError {
    InvalidInteger {
        row: usize,
        field: String,
        value: String,
    },
    InvalidFloat {
        row: usize,
        field: String,
        value: String,
    },
    MissingRequiredField {
        row: usize,
        field: String,
    },
}

impl std::fmt::Display for RowValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RowValidationError::InvalidInteger { row, field, value } => {
                write!(
                    f,
                    "InvalidInteger row:{} field:{} value:{}",
                    row, field, value
                )
            }
            RowValidationError::InvalidFloat { row, field, value } => {
                write!(
                    f,
                    "InvalidFloat row:{} field:{} value:{}",
                    row, field, value
                )
            }
            RowValidationError::MissingRequiredField { row, field } => {
                write!(f, "MissingRequiredField row:{} field:{}", row, field)
            }
        }
    }
}

impl std::error::Error for RowValidationError {}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(tag = "error_type")]
pub enum ImportWarning {
    VersionExceeded {
        file_version: usize,
        max_supported_version: usize,
        actual_version: usize,
    },
}

impl std::fmt::Display for ImportWarning {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ImportWarning::VersionExceeded {
                file_version,
                max_supported_version,
                actual_version,
            } => {
                write!(
                    f,
                    "VersionExceeded file_version:{} max:{} actual:{}",
                    file_version, max_supported_version, actual_version
                )
            }
        }
    }
}

impl std::error::Error for ImportWarning {}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ImportResult {
    pub success: bool,
    pub valid_result: bool,
    pub data_version: usize,
    pub actual_version: usize,
    pub lack_columns: Vec<String>,
    pub valid_columns: Vec<String>,
    pub total: usize,
    pub imported: usize,
    pub updated: usize,
    pub cost_time: i64,
    pub errors: Vec<RowValidationError>,
    pub warnings: Vec<ImportWarning>,
}
