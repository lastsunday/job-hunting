use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
pub struct TaskConfig {
    pub history_file_max_size: Option<i64>,
}
