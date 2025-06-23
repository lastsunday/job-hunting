use api::setup_index;

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt; // for `collect`
use tower::ServiceExt;
use utoipa_axum::router::OpenApiRouter; // for `call`, `oneshot`, and `ready`

#[tokio::test]
async fn hello_world() {
    let app = OpenApiRouter::new();
    let app = setup_index(app).split_for_parts().0;
    let response = app
        .oneshot(
            Request::builder()
                .uri("/hello")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(&body[..], b"Hello, World!");
}

#[tokio::test]
async fn version() {
    let app = OpenApiRouter::new();
    let app = setup_index(app).split_for_parts().0;
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
