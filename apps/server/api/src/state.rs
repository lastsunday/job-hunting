use sea_orm::DatabaseConnection;

#[derive(Clone, Debug)]
pub struct AppState {
    pub conn: DatabaseConnection,
    pub auth_client_id: String,
    pub auth_client_secret: String,
}
