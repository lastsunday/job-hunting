use std::collections::HashMap;

use chrono::{DateTime, Utc};

pub trait Repo {
    async fn query_repo_file_date_and_max_seq_map(
        &self,
        file_name: &str,
        url: &str,
        key: &Option<String>,
        now: &DateTime<Utc>,
        retention_day: i32,
    ) -> Result<HashMap<DateTime<Utc>, i32>, anyhow::Error>;
}

pub struct GitRepo {}

impl GitRepo {
    pub fn new() -> Self {
        Self {}
    }
}

impl Default for GitRepo {
    fn default() -> Self {
        Self::new()
    }
}

impl Repo for GitRepo {
    async fn query_repo_file_date_and_max_seq_map(
        &self,
        file_name: &str,
        url: &str,
        key: &Option<String>,
        now: &DateTime<Utc>,
        retention_day: i32,
    ) -> Result<HashMap<DateTime<Utc>, i32>, anyhow::Error> {
        let mut result = HashMap::new();
        result.insert("2024-01-02T00:00:00Z".parse::<DateTime<Utc>>()?, 1);
        result.insert("2024-01-01T00:00:00Z".parse::<DateTime<Utc>>()?, 1);
        Ok(result)
    }
}
