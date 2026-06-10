use serde::Deserialize;

use crate::config::{ListeningAddr, ListeningPort};

#[derive(Debug, Deserialize, Clone)]
pub struct ServerConfig {
    pub server_name: Option<String>,
    pub address: Option<ListeningAddr>,
    pub port: Option<ListeningPort>,
}
