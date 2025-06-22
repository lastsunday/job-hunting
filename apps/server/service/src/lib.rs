use sea_orm::DatabaseConnection;

pub mod database;
pub mod util;

#[derive(Clone, Debug)]
pub struct AppState {
    pub conn: DatabaseConnection,
}
