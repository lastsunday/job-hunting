use std::collections::HashMap;

use chrono::{DateTime, Utc};

pub trait Repo {
    async fn query_repo_file_date_and_max_seq_map(
        &self,
        file_name: &str,
        url: &str,
        key: Option<String>,
        now: DateTime<Utc>,
        retention_day: i32,
    ) -> Result<HashMap<DateTime<Utc>, i32>, anyhow::Error>;
}

pub struct GitRepo {}

impl Repo for GitRepo {
    async fn query_repo_file_date_and_max_seq_map(
        &self,
        file_name: &str,
        url: &str,
        key: Option<String>,
        now: DateTime<Utc>,
        retention_day: i32,
    ) -> Result<HashMap<DateTime<Utc>, i32>, anyhow::Error> {
        todo!()
    }
}
