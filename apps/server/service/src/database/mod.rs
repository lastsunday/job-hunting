use dotenvy::dotenv;
use sea_orm::ConnectOptions;
use sea_orm::Database;
use sea_orm::DatabaseConnection;
use sea_orm::DbErr;
use std::env;
use std::time::Duration;
use tracing::log;

pub async fn establish_connection(mut url: Option<String>) -> Result<DatabaseConnection, DbErr> {
    dotenv().ok();
    let target_url = match url.is_none() {
        true => env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
        false => url.take().expect("Url must be set"),
    };
    let mut opt = ConnectOptions::new(target_url);
    opt.max_connections(100)
        .min_connections(5)
        .connect_timeout(Duration::from_secs(8))
        .acquire_timeout(Duration::from_secs(8))
        .idle_timeout(Duration::from_secs(8))
        .max_lifetime(Duration::from_secs(8))
        .sqlx_logging(true)
        .sqlx_logging_level(log::LevelFilter::Info);
    Database::connect(opt).await
}
