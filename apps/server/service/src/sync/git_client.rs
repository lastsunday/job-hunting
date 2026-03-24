use reqwest::Client;
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct GitClient {
    client: Client,
    base_url: String,
    token: Option<String>,
    custom_headers: HashMap<String, String>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RepoContent {
    pub name: String,
    pub path: String,
    pub sha: String,
    pub size: u64,
    #[serde(rename = "type")]
    pub file_type: String,
    pub download_url: Option<String>,
    pub content: Option<String>,
    pub encoding: Option<String>,
}

impl GitClient {
    pub fn new(base_url: String, token: Option<String>) -> Self {
        let client = Client::builder()
            .user_agent("job-hunting-server")
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            base_url,
            token,
            custom_headers: HashMap::new(),
        }
    }

    pub fn with_header(mut self, key: &str, value: &str) -> Self {
        self.custom_headers.insert(key.to_string(), value.to_string());
        self
    }

    fn build_url(&self, endpoint: &str) -> String {
        if endpoint.starts_with("http") {
            endpoint.to_string()
        } else {
            format!("{}{}", self.base_url.trim_end_matches('/'), endpoint)
        }
    }

    fn apply_auth_and_headers(&self, request: reqwest::RequestBuilder) -> reqwest::RequestBuilder {
        let mut request = request;
        
        if let Some(token) = &self.token {
            if token.contains(':') {
                request = request.basic_auth(token, Option::<&str>::None);
            } else {
                request = request.bearer_auth(token);
            }
        }

        for (key, value) in &self.custom_headers {
            request = request.header(key, value);
        }

        request
    }

    pub async fn list_files(
        &self,
        owner: &str,
        repo: &str,
        path: &str,
    ) -> Result<Vec<RepoContent>, String> {
        let endpoint = format!("/repos/{}/{}/contents/{}", owner, repo, path);
        let url = self.build_url(&endpoint);

        let mut request = self.client.get(&url);
        request = self.apply_auth_and_headers(request);
        
        let response = request
            .header("Accept", "application/vnd.github.v3+json")
            .header("User-Agent", "job-hunting-server")
            .send()
            .await
            .map_err(|e| format!("Failed to fetch files: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(format!("Git API error: {} - {}", status, text));
        }

        let text = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;
        let contents: Vec<RepoContent> = serde_json::from_str(&text)
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        Ok(contents)
    }

    pub async fn download_file(&self, url: &str) -> Result<Vec<u8>, String> {
        let mut request = self.client.get(url);
        request = self.apply_auth_and_headers(request);
        
        let response = request
            .header("Accept", "application/vnd.github.v3.raw")
            .header("User-Agent", "job-hunting-server")
            .send()
            .await
            .map_err(|e| format!("Failed to download file: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            return Err(format!("Failed to download: {}", status));
        }

        let bytes = response
            .bytes()
            .await
            .map_err(|e| format!("Failed to read file content: {}", e))?;

        Ok(bytes.to_vec())
    }

    pub async fn get_file(
        &self,
        owner: &str,
        repo: &str,
        path: &str,
    ) -> Result<RepoContent, String> {
        let endpoint = format!("/repos/{}/{}/contents/{}", owner, repo, path);
        let url = self.build_url(&endpoint);

        let mut request = self.client.get(&url);
        request = self.apply_auth_and_headers(request);
        
        let response = request
            .header("Accept", "application/vnd.github.v3+json")
            .header("User-Agent", "job-hunting-server")
            .send()
            .await
            .map_err(|e| format!("Failed to fetch file: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            return Err(format!("File not found: {}", status));
        }

        let text = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;
        let content: RepoContent = serde_json::from_str(&text)
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        Ok(content)
    }

    pub fn set_token(&mut self, token: String) {
        self.token = Some(token);
    }

    pub fn set_base_url(&mut self, base_url: String) {
        self.base_url = base_url;
    }
}
