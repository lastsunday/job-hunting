use sea_orm::ConnectOptions;
use sea_orm::Database;
use sea_orm::DatabaseConnection;
use std::cmp::max;
use std::time::Duration;

pub async fn establish_connection(url: &str) -> anyhow::Result<DatabaseConnection> {
    let mut opt = ConnectOptions::new(url);
    let cpus = num_cpus::get() as u32;

    if url.starts_with("sqlite:") {
        let max_conn = if url.contains(":memory:") { 1 } else { 4 };
        opt.min_connections(1)
            .max_connections(max_conn)
            .map_sqlx_sqlite_opts(|sqlite_opts| {
                sqlite_opts
                    .busy_timeout(Duration::from_secs(5))
                    .pragma("journal_mode", "WAL")
                    .pragma("synchronous", "NORMAL")
            });
    } else {
        opt.min_connections(max(cpus * 4, 10))
            .max_connections(max(cpus * 8, 20));
    }

    opt.connect_timeout(Duration::from_secs(10))
        .acquire_timeout(Duration::from_secs(30))
        .idle_timeout(Duration::from_secs(60))
        .max_lifetime(Duration::from_secs(3600 * 24))
        .sqlx_logging(false);
    let db = Database::connect(opt).await?;
    Ok(db)
}
