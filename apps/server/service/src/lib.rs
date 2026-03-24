use sea_orm::DatabaseConnection;

pub mod util;
pub mod sync;

#[derive(Clone, Debug)]
pub struct AppState {
    pub conn: DatabaseConnection,
}
