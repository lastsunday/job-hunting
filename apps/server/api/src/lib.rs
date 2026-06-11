pub mod company;
pub mod config;
pub mod file;
pub mod index;
pub mod job;
pub mod server;
pub mod statistics;
pub mod sync;
pub mod task;
pub mod task_data_plan;
pub mod task_statistics;
pub mod user;

use std::net::SocketAddr;
use std::sync::Arc;
use std::sync::OnceLock;
use std::time::Duration;

use axum::Router;
use axum::ServiceExt;
use axum::extract::DefaultBodyLimit;
use axum::extract::Request;
use axum::http::StatusCode;
use axum::routing::get;
use bytesize::ByteSize;
use either::Either;
use framework::error::critical_code::CriticalErrorCode;
use framework::error::framework_code::FrameworkErrorCode;
use futures::future::join_all;
use migration::MigratorTrait;
use sea_orm::DatabaseConnection;
use service::task::scheduler::SchedulerConfig;
use service::task::scheduler::start_scheduler;
use tokio::net::TcpListener;
use tokio_util::sync::CancellationToken;
use tower_layer::Layer;

use crate::config::database::DatabaseConfig;
use crate::config::server::ServerConfig;
use crate::config::task::TaskConfig;

use framework::error::ApiResult;
use framework::trace::*;
use framework::*;
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

use framework::auth::Jwt;
use framework::config::auth::AuthConfig;

static SERVER_VERSION: OnceLock<&'static str> = OnceLock::new();

pub fn set_server_version(v: &'static str) {
    let version = build_metadata::version_tag()
        .map_or_else(|| v.to_owned(), |tag| format!("{v} ({tag})"));
    SERVER_VERSION.set(Box::leak(version.into_boxed_str())).ok();
}

pub fn server_version() -> &'static str {
    SERVER_VERSION.get().copied().unwrap_or("unknown")
}

pub async fn start(
    server_config: Arc<ServerConfig>,
    database_config: Arc<DatabaseConfig>,
    auth_config: Arc<AuthConfig>,
    task_config: Arc<TaskConfig>,
) -> anyhow::Result<()> {
    // auth
    Jwt::init(auth_config.clone());
    // database init
    let database_url = database_config.url.as_ref().expect("database url is empty");
    let conn: sea_orm::DatabaseConnection =
        framework::database::establish_connection(database_url).await?;
    let conn_clone = conn.clone();
    conn.ping().await?;
    tracing::info!("Database connected successfully");
    // database schema init or upgrade
    migration::Migrator::up(&conn, None).await?;
    let ct = tokio_util::sync::CancellationToken::new();
    let ct_for_app = ct.clone();
    let mut handles = Vec::new();
    handles.push(tokio::spawn(async move {
        if let Err(error) = start_app(server_config, auth_config, conn, ct_for_app).await {
            tracing::error!("{:?}", error);
        }
    }));
    handles.push(tokio::spawn(async move {
        start_scheduler(
            conn_clone,
            SchedulerConfig {
                history_file_max_size: task_config.history_file_max_size,
            },
        );
    }));
    let join_results = join_all(handles).await;
    tracing::info!("all joinhandle({}) end", join_results.len());
    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub async fn start_app(
    server_config: Arc<ServerConfig>,
    auth_config: Arc<AuthConfig>,
    conn: sea_orm::DatabaseConnection,
    ct: CancellationToken,
) -> anyhow::Result<()> {
    let addrs = server_config
        .address
        .as_ref()
        .expect("server address is empty")
        .addrs
        .clone();
    let port = match &server_config
        .port
        .as_ref()
        .expect("server port is empty")
        .ports
    {
        Either::Left(value) => value,
        Either::Right(values) => values.first().expect("port is empty"),
    };
    // state
    let state = AppState { conn, auth_config };
    // router
    let (app, ct) = create_router(state, ct);
    // app start
    tracing::info!("app start");
    let addr = match addrs {
        Either::Left(value) => value.to_string(),
        Either::Right(values) => values.first().expect("addrs is empty").to_string(),
    };
    let listener = TcpListener::bind(format!("{addr}:{port}")).await?;
    tracing::info!("listening on {addr}:{port}");
    let app = NormalizePathLayer::trim_trailing_slash().layer(app);
    axum::serve(
        listener,
        ServiceExt::<Request>::into_make_service_with_connect_info::<SocketAddr>(app),
    )
    .with_graceful_shutdown(async move {
        tokio::signal::ctrl_c().await.unwrap();
        ct.cancel();
    })
    .await?;
    tracing::info!("app end");
    Ok(())
}

#[derive(OpenApi)]
#[openapi()]
struct ApiDoc;

pub fn create_router(
    state: AppState,
    cancellation_token: CancellationToken,
) -> (Router, CancellationToken) {
    let mut api = ApiDoc::openapi();
    api.components.as_mut().unwrap().add_security_scheme(
        "AccessToken",
        SecurityScheme::Http(Http::new(HttpAuthScheme::Bearer)),
    );
    let mut api_router = OpenApiRouter::with_openapi(api);
    api_router = setup_index(api_router);
    api_router = setup_job(api_router, state.clone());
    api_router = setup_company(api_router, state.clone());
    api_router = setup_auth(api_router, state.clone());
    api_router = setup_sync(api_router, state.clone());
    api_router = setup_file(api_router, state.clone());
    api_router = setup_statistics(api_router, state.clone());
    api_router = setup_task(api_router, state.clone());
    api_router = setup_task_data_plan(api_router, state.clone());
    api_router = setup_task_statistics(api_router, state.clone());
    let (mut app, api) = api_router.split_for_parts();
    app = setup_web(app);
    app = setup_api_fallback(app);
    app = setup_default(app);
    app = app.merge(Scalar::with_url("/docs", api));
    (app, cancellation_token)
}

pub fn setup_default(router: Router) -> Router {
    let router = router.fallback(web::index_handler);
    let app = router.method_not_allowed_fallback(async || -> ApiResult<()> {
        tracing::warn!("Method not allowed");
        Err(err!(FrameworkErrorCode::MethodNotAllowed))
    });
    let timeout =
        TimeoutLayer::with_status_code(StatusCode::REQUEST_TIMEOUT, Duration::from_secs(300));
    let body_limit = DefaultBodyLimit::max(ByteSize::mib(100).as_u64() as usize);
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

pub fn setup_company(router: OpenApiRouter, state: AppState) -> OpenApiRouter {
    api_setup(router, company::create_routes(state))
}

pub fn setup_auth(router: OpenApiRouter, state: AppState) -> OpenApiRouter {
    api_setup(router, user::create_routes(state))
}

pub fn setup_sync(router: OpenApiRouter, state: AppState) -> OpenApiRouter {
    api_setup(router, sync::create_routes(state))
}

pub fn setup_task(router: OpenApiRouter, state: AppState) -> OpenApiRouter {
    api_setup(router, task::create_routes(state))
}

pub fn setup_file(router: OpenApiRouter, state: AppState) -> OpenApiRouter {
    api_setup(router, file::create_routes(state))
}

pub fn setup_statistics(router: OpenApiRouter, state: AppState) -> OpenApiRouter {
    api_setup(router, statistics::create_routes(state))
}

pub fn setup_task_data_plan(router: OpenApiRouter, state: AppState) -> OpenApiRouter {
    api_setup(router, task_data_plan::create_routes(state))
}

pub fn setup_task_statistics(router: OpenApiRouter, state: AppState) -> OpenApiRouter {
    api_setup(router, task_statistics::create_routes(state))
}

fn api_setup(router: OpenApiRouter, api_router: OpenApiRouter) -> OpenApiRouter {
    router.nest("/api", api_router)
}

fn setup_api_fallback(router: Router) -> Router {
    router.nest(
        "/api",
        Router::new().fallback(async || -> ApiResult<()> {
            tracing::warn!("Not found");
            Err(err!(CriticalErrorCode::ResourceNotFound))
        }),
    )
}

pub fn setup_web(router: Router) -> Router {
    router
        .nest(
            "/assets",
            Router::new()
                .route("/{*file}", get(web::assets_handler))
                .route_layer(CompressionLayer::new()),
        )
        .nest(
            "/locales",
            Router::new()
                .route("/{*file}", get(web::locales_handler))
                .route_layer(CompressionLayer::new()),
        )
}

#[derive(Clone, Debug)]
pub struct AppState {
    pub conn: DatabaseConnection,
    pub auth_config: Arc<AuthConfig>,
}
