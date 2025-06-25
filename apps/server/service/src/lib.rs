use sea_orm::DatabaseConnection;

pub mod util;

#[derive(Clone, Debug)]
pub struct AppState {
    pub conn: DatabaseConnection,
}
