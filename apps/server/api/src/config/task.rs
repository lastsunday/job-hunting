use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
pub struct TaskConfig {
    pub history_file_max_size: i64,
}

impl Default for TaskConfig {
    fn default() -> Self {
        Self {
            history_file_max_size: 5 * 1024 * 1024 * 1024,
        }
    }
}
