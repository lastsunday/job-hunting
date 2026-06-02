use serde::Deserialize;

#[derive(Debug, Default, Deserialize)]
pub struct TaskConfig {
    history_file_max_size: Option<i64>,
}

impl TaskConfig {
    pub fn new() -> Self {
        Self {
            history_file_max_size: Some(5 * 1024 * 1024 * 1024),
        }
    }

    pub fn history_file_max_size(&self) -> i64 {
        self.history_file_max_size.unwrap_or(5 * 1024 * 1024 * 1024)
    }
}
