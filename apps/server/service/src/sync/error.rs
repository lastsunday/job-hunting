use thiserror::Error;

#[derive(Debug, Error)]
pub enum ImportError {
    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

impl From<sea_orm::DbErr> for ImportError {
    fn from(err: sea_orm::DbErr) -> Self {
        ImportError::Internal(err.into())
    }
}
