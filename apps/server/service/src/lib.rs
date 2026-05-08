use sea_orm::DatabaseConnection;

pub mod sync;
pub mod task;
pub mod util;

#[derive(Clone, Debug)]
pub struct AppState {
    pub conn: DatabaseConnection,
}
