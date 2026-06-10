use std::{fmt::Display, time::Duration};

use axum::http::Response;
use tower_http::trace::{OnFailure, OnResponse};
use tracing::Span;

#[derive(Debug, Clone, Copy)]
pub struct LatencyOnResponse;

impl<B> OnResponse<B> for LatencyOnResponse {
    fn on_response(self, response: &Response<B>, latency: Duration, _span: &Span) {
        tracing::info!(latency = %Latency(latency), status = response.status().as_u16(),)
    }
}

#[derive(Debug, Clone, Copy)]
pub struct ErrorOnFailure;

impl<E: std::fmt::Debug> OnFailure<E> for ErrorOnFailure {
    fn on_failure(&mut self, error: E, latency: Duration, _span: &Span) {
        tracing::error!(latency = %Latency(latency), error = ?error, "Request failed");
    }
}

struct Latency(Duration);

impl Display for Latency {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.0.as_millis() > 0 {
            write!(f, "{} ms", self.0.as_millis())
        } else {
            write!(f, "{} us", self.0.as_micros())
        }
    }
}
