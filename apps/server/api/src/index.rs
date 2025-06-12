use axum::{Router, routing::get};

pub async fn root() -> &'static str {
    "Hello, World!"
}

pub fn routes() -> Router {
    Router::new().route("/", get(root))
}

