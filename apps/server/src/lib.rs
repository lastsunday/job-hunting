use sea_orm::DatabaseConnection;

pub mod service;
pub mod data;
pub mod database;
pub mod util;

#[derive(Clone,Debug)]
pub struct AppState {
    pub conn: DatabaseConnection,
}