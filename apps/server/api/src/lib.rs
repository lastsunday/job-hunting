mod common;
mod config;
pub mod index;
pub mod job;

use std::time::Duration;

use axum::Router;
use axum::extract::DefaultBodyLimit;
use axum::extract::Request;
use bytesize::ByteSize;
use migration::MigratorTrait;
use service::AppState;
use tokio::net::TcpListener;

use common::error::*;
use common::trace::*;
use common::*;
use tower_http::cors;
use tower_http::cors::CorsLayer;
use tower_http::normalize_path::NormalizePathLayer;
use tower_http::timeout::TimeoutLayer;
use tower_http::trace::TraceLayer;

#[tokio::main]
async fn start() -> anyhow::Result<()> {
    //init logger
    logger::init();
    // config
    let port = config::get().server().port();
    let database_url = config::get().database().url();
    // database init
    let conn: sea_orm::DatabaseConnection =
        service::database::establish_connection(database_url).await?;
    conn.ping().await?;
    tracing::info!("Database connected successfully");
    // database schema init or upgrade
    migration::Migrator::up(&conn, None).await?;
    // state
    let state = AppState { conn };
    // router
    let app = create_router(state);
    // app start
    let listener = TcpListener::bind(format!("0.0.0.0:{port}")).await?;
    tracing::info!("listening on http://0.0.0.0:{port}");
    axum::serve(listener, app).await?;
    Ok(())
}

pub fn create_router(state: AppState) -> Router {
    let mut app = Router::new();
    app = setup_index(app);
    app = setup_job(app, state.clone());
    app = app
        .fallback(async || -> ApiResult<()> {
            tracing::warn!("Not found");
            Err(ApiError::NotFound)
        })
        .method_not_allowed_fallback(async || -> ApiResult<()> {
            tracing::warn!("Method not allowed");
            Err(ApiError::MethodNotAllowed)
        });
    let timeout = TimeoutLayer::new(Duration::from_secs(120));
    let body_limit = DefaultBodyLimit::max(ByteSize::mib(10).as_u64() as usize);
    let cors = CorsLayer::new()
        .allow_origin(cors::Any)
        .allow_methods(cors::Any)
        .allow_headers(cors::Any)
        .allow_credentials(false)
        .max_age(Duration::from_secs(3600 * 12));
    let normalize_path = NormalizePathLayer::trim_trailing_slash();
    let tracing = TraceLayer::new_for_http()
        .make_span_with(|request: &Request| {
            let method = request.method();
            let path = request.uri().path();
            let id = xid::new();
            tracing::info_span!("Api Request",id = %id,method = %method,path = %path)
        })
        .on_request(())
        .on_failure(())
        .on_response(LatencyOnResponse);
    app = app
        .layer(timeout)
        .layer(body_limit)
        .layer(tracing)
        .layer(cors)
        .layer(normalize_path);
    app
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
