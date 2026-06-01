use std::collections::HashMap;
use std::path::Path;

use anyhow::Context;
use chrono::{DateTime, Utc};
use regex::Regex;

use crate::util;

pub struct QueryFileDateAndMaxSeqParam {
    pub file_name: String,
    pub url: String,
    pub token: Option<String>,
    pub now: DateTime<Utc>,
    pub retention_day: i32,
}

pub struct DownloadFileParam {
    pub url: String,
    pub datetime: DateTime<Utc>,
    pub file_name: String,
    pub token: Option<String>,
}

pub struct FileInfo {
    pub content: Vec<u8>,
    pub file_name: Option<String>,
    pub size: i64,
}

pub trait Repo {
    fn query_file_date_and_max_seq(
        &self,
        param: QueryFileDateAndMaxSeqParam,
    ) -> impl Future<Output = Result<HashMap<DateTime<Utc>, i32>, anyhow::Error>>;

    fn download_file(
        &self,
        param: DownloadFileParam,
    ) -> impl Future<Output = Result<FileInfo, anyhow::Error>>;
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
    async fn query_file_date_and_max_seq(
        &self,
        param: QueryFileDateAndMaxSeqParam,
    ) -> Result<HashMap<DateTime<Utc>, i32>, anyhow::Error> {
        // 根据保留日期进行过滤，避免过多文件路径查询和返回
        let path_map = util::git_lite::ls_tree(&param.url, "HEAD", param.token.as_deref()).await?;

        let stem = Path::new(&param.file_name)
            .file_stem()
            .and_then(|s| s.to_str())
            .ok_or_else(|| anyhow::anyhow!("Invalid file name: {}", param.file_name))?;

        let pattern = format!(
            r"([0-9]{{4}})/([0-1][0-9])-([0-3][0-9])/{}(_[1-9][0-9]*)?\..*",
            regex::escape(stem)
        );
        let re = Regex::new(&pattern)?;

        let cutoff = param.now - chrono::Duration::days(param.retention_day as i64);

        let mut result: HashMap<DateTime<Utc>, i32> = HashMap::new();

        for path in path_map.keys() {
            if let Some(caps) = re.captures(path.as_str()) {
                let date_str = format!("{}-{}-{}T00:00:00Z", &caps[1], &caps[2], &caps[3]);
                let date = date_str.parse::<DateTime<Utc>>()?;
                if date >= cutoff {
                    *result.entry(date).or_insert(0) += 1;
                }
            }
        }

        Ok(result)
    }

    async fn download_file(&self, param: DownloadFileParam) -> Result<FileInfo, anyhow::Error> {
        let DownloadFileParam {
            url,
            datetime,
            file_name,
            token,
        } = param;
        let path = get_path_by_datetime_file_name(&datetime, &file_name);
        let files_map =
            util::git_lite::sparse_checkout(&url, "HEAD", &[&path], token.as_deref()).await?;
        let content = files_map
            .get(&path)
            .context(format!("file not found by path = {}", path))?;
        Ok(FileInfo {
            content: content.clone(),
            file_name: Some(file_name),
            size: content.len() as i64,
        })
    }
}

fn get_path_by_datetime_file_name(datetime: &DateTime<Utc>, file_name: &str) -> String {
    format!("{}/{}", datetime.format("%Y/%m-%d"), file_name)
}
