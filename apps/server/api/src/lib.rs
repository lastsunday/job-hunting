pub mod data;
pub mod index;
pub mod job;

use axum::Router;
use migration::MigratorTrait;
use service::AppState;
use tracing_subscriber::{filter, prelude::*};

#[tokio::main]
async fn start() -> anyhow::Result<()> {
    let stdout_log = tracing_subscriber::fmt::layer().with_line_number(false);

    tracing_subscriber::registry()
        .with(stdout_log.with_filter(filter::LevelFilter::INFO))
        .init();

    let conn: sea_orm::DatabaseConnection =
        service::database::establish_connection(None).await.unwrap();
    migration::Migrator::up(&conn, None).await.unwrap();
    let state = AppState { conn };
    let app = Router::new();
    let app = setup_index(app);
    let app = setup_job(app, state);
    // run our app with hyper
    let listener = tokio::net::TcpListener::bind("127.0.0.1:8080")
        .await
        .unwrap();
    tracing::info!("listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
    Ok(())
}

pub fn setup_index(router: Router) -> Router {
    router.merge(index::routes())
}

pub fn setup_job(router: Router, state: AppState) -> Router {
    router.nest("/api", job::routes(state))
}

pub fn main() {
    let result = start();

    if let Some(err) = result.err() {
        println!("Error: {err}");
    }
}
