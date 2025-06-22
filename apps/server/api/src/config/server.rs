use serde::Deserialize;

#[derive(Debug, Default, Deserialize)]
pub struct ServerConfig {
    port: Option<u16>,
}

impl ServerConfig {
    pub fn new() -> Self {
        Self { port: Some(3000) }
    }

    pub fn port(&self) -> u16 {
        self.port.unwrap_or(3000)
    }
}
