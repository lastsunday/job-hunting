pub mod auth;
pub mod common;
pub mod config;
pub mod index;
pub mod job;

use std::net::SocketAddr;
use std::time::Duration;

use axum::Router;
use axum::extract::DefaultBodyLimit;
use axum::extract::Request;
use axum::routing::get;
use bytesize::ByteSize;
use migration::MigratorTrait;
use service::AppState;
use tokio::net::TcpListener;

use common::error::*;
use common::trace::*;
use common::*;
use tower_http::compression::CompressionLayer;
use tower_http::cors;
use tower_http::cors::CorsLayer;
use tower_http::normalize_path::NormalizePathLayer;
use tower_http::timeout::TimeoutLayer;
use tower_http::trace::TraceLayer;
use utoipa::OpenApi;
use utoipa::openapi::security::Http;
use utoipa::openapi::security::HttpAuthScheme;
use utoipa::openapi::security::SecurityScheme;
use utoipa_axum::router::OpenApiRouter;
use utoipa_scalar::{Scalar, Servable as ScalarServable};

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
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;
    Ok(())
}

#[derive(OpenApi)]
#[openapi()]
struct ApiDoc;

pub fn create_router(state: AppState) -> Router {
    let mut api = ApiDoc::openapi();
    api.components.as_mut().unwrap().add_security_scheme(
        "AccessToken",
        SecurityScheme::Http(Http::new(HttpAuthScheme::Bearer)),
    );
    let mut api_router = OpenApiRouter::with_openapi(api);
    api_router = setup_index(api_router);
    api_router = setup_job(api_router, state.clone());
    api_router = setup_auth(api_router, state.clone());
    let (mut app, api) = api_router.split_for_parts();
    app = setup_web(app);
    app = setup_api_fallback(app);
    app = setup_default(app);
    app = app.merge(Scalar::with_url("/docs", api));
    app
}

pub fn setup_default(router: Router) -> Router {
    let app = router
        .fallback(web::index_handler)
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
    app.layer(timeout)
        .layer(body_limit)
        .layer(tracing)
        .layer(cors)
        .layer(normalize_path)
}

pub fn setup_index(router: OpenApiRouter) -> OpenApiRouter {
    router.merge(index::create_routes())
}

pub fn setup_job(router: OpenApiRouter, state: AppState) -> OpenApiRouter {
    api_setup(router, job::create_routes(state))
}

pub fn setup_auth(router: OpenApiRouter, state: AppState) -> OpenApiRouter {
    api_setup(router, auth::create_routes(state))
}

fn api_setup(router: OpenApiRouter, api_router: OpenApiRouter) -> OpenApiRouter {
    router.nest("/api", api_router)
}

fn setup_api_fallback(router: Router) -> Router {
    router.nest(
        "/api",
        Router::new().fallback(async || -> ApiResult<()> {
            tracing::warn!("Not found");
            Err(ApiError::NotFound)
        }),
    )
}

pub fn setup_web(router: Router) -> Router {
    router.nest(
        "/assets",
        Router::new()
            .route("/{*file}", get(web::assets_handler))
            .route_layer(CompressionLayer::new()),
    )
}

pub fn main() {
    let result = start();

    if let Some(err) = result.err() {
        println!("Error: {err}");
    }
}
