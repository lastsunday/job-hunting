use api::setup_index;

use axum::{
    Router,
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt; // for `collect`
use tower::ServiceExt; // for `call`, `oneshot`, and `ready`

#[tokio::test]
async fn hello_world() {
    let app = Router::new();
    let app = setup_index(app);
    let response = app
        .oneshot(Request::builder().uri("/").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(&body[..], b"Hello, World!");
}

#[tokio::test]
async fn version() {
    let app = Router::new();
    let app = setup_index(app);
    let response = app
        .oneshot(
            Request::builder()
                .uri("/version")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert!(!String::from_utf8(body.to_vec()).unwrap().is_empty());
}
