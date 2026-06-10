use thiserror::Error;

use crate::common::FileError;

#[derive(Debug, Error)]
pub enum Error {
    #[error(transparent)]
    File(#[from] FileError),

    #[error("invalid cron expr: {0}")]
    Cron(String),

    #[error("{0}")]
    FinishedButError(String),

    #[error("download timeout: {0}")]
    DownloadTimeout(String),

    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

impl From<sea_orm::DbErr> for Error {
    fn from(err: sea_orm::DbErr) -> Self {
        Error::Internal(err.into())
    }
}
