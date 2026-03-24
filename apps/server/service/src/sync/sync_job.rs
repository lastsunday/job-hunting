use sea_orm::DatabaseConnection;
use chrono::{DateTime, FixedOffset, Utc};
use std::path::PathBuf;

use crate::sync::git_client::GitClient;
use crate::sync::file_parser::FileParser;
use crate::sync::import_job::JobImporter;
use crate::sync::types::SyncResult;

pub struct JobSync;

impl JobSync {
    pub async fn sync(
        conn: &DatabaseConnection,
        client: &GitClient,
        owner: &str,
        repo: &str,
        start_datetime: Option<DateTime<FixedOffset>>,
        end_datetime: Option<DateTime<FixedOffset>>,
    ) -> Result<SyncResult, String> {
        let mut total_files = 0;
        let mut total_records = 0;
        let mut imported = 0;
        let mut errors = Vec::new();

        let datetime = end_datetime.unwrap_or_else(|| Utc::now().with_timezone(&FixedOffset::west_opt(0).unwrap()));
        let dir_path = format!("{}/{}", datetime.format("%Y-%m-%d"), "job");

        match client.list_files(owner, repo, &dir_path).await {
            Ok(files) => {
                let xlsx_files: Vec<_> = files
                    .into_iter()
                    .filter(|f| f.name.ends_with(".xlsx"))
                    .collect();

                total_files = xlsx_files.len();

                for file in xlsx_files {
                    if let Some(download_url) = &file.download_url {
                        match client.download_file(download_url).await {
                            Ok(data) => {
                                match FileParser::parse_job_file_from_bytes(&data) {
                                    Ok(rows) => {
                                        total_records += rows.len();
                                        match JobImporter::import(conn, rows).await {
                                            Ok(result) => {
                                                imported += result.imported;
                                                if !result.errors.is_empty() {
                                                    errors.extend(result.errors);
                                                }
                                            }
                                            Err(e) => {
                                                errors.push(format!("Import error for {}: {}", file.name, e));
                                            }
                                        }
                                    }
                                    Err(e) => {
                                        errors.push(format!("Parse error for {}: {}", file.name, e));
                                    }
                                }
                            }
                            Err(e) => {
                                errors.push(format!("Download error for {}: {}", file.name, e));
                            }
                        }
                    }
                }
            }
            Err(e) => {
                errors.push(format!("Failed to list files: {}", e));
            }
        }

        Ok(SyncResult {
            success: errors.is_empty(),
            total_files,
            total_records,
            imported,
            updated: 0,
            errors,
        })
    }
}
