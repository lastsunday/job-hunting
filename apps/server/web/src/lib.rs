use axum::extract::Path;
use axum::http::{Method, StatusCode};
use axum::response::IntoResponse;

#[cfg(feature = "embed-frontend")]
use axum::http::header;
#[cfg(feature = "embed-frontend")]
use rust_embed::Embed;

#[cfg(feature = "embed-frontend")]
#[derive(Embed)]
#[folder = "dist"]
#[include = "index.html"]
struct IndexHtml;

#[cfg(feature = "embed-frontend")]
#[derive(Embed)]
#[folder = "dist/assets"]
struct Assets;

#[cfg(feature = "embed-frontend")]
struct AssetsFile<T>(T);

#[cfg(feature = "embed-frontend")]
impl<T: AsRef<str>> IntoResponse for AssetsFile<T> {
    fn into_response(self) -> axum::response::Response {
        let path = self.0.as_ref();
        match Assets::get(path) {
            Some(file) => {
                let mime = file.metadata.mimetype();
                let body = file.data;
                ([(header::CONTENT_TYPE, mime)], body).into_response()
            }
            None => (StatusCode::NOT_FOUND, "Not found").into_response(),
        }
    }
}

#[cfg(not(feature = "embed-frontend"))]
pub async fn assets_handler(Path(_path): Path<String>) -> impl IntoResponse {
    (StatusCode::NOT_FOUND, "Not found").into_response()
}

#[cfg(feature = "embed-frontend")]
pub async fn assets_handler(Path(path): Path<String>) -> impl IntoResponse {
    AssetsFile(path).into_response()
}

#[cfg(feature = "embed-frontend")]
#[derive(Embed)]
#[folder = "dist/locales"]
struct Locales;

#[cfg(feature = "embed-frontend")]
struct LocalesFile<T>(T);

#[cfg(feature = "embed-frontend")]
impl<T: AsRef<str>> IntoResponse for LocalesFile<T> {
    fn into_response(self) -> axum::response::Response {
        let path = self.0.as_ref();
        match Locales::get(path) {
            Some(file) => {
                let mime = file.metadata.mimetype();
                let body = file.data;
                ([(header::CONTENT_TYPE, mime)], body).into_response()
            }
            None => (StatusCode::NOT_FOUND, "Not found").into_response(),
        }
    }
}

#[cfg(not(feature = "embed-frontend"))]
pub async fn locales_handler(Path(_path): Path<String>) -> impl IntoResponse {
    (StatusCode::NOT_FOUND, "Not found").into_response()
}

#[cfg(feature = "embed-frontend")]
pub async fn locales_handler(Path(path): Path<String>) -> impl IntoResponse {
    LocalesFile(path).into_response()
}

#[cfg(not(feature = "embed-frontend"))]
pub async fn index_handler(_method: Method) -> impl IntoResponse {
    (StatusCode::NOT_FOUND, "Not Found").into_response()
}

#[cfg(feature = "embed-frontend")]
pub async fn index_handler(method: Method) -> impl IntoResponse {
    if method == Method::GET {
        let file = IndexHtml::get("index.html").expect("index.html not found");
        ([(header::CONTENT_TYPE, "text/html")], file.data).into_response()
    } else {
        (StatusCode::NOT_FOUND, "Not Found").into_response()
    }
}
