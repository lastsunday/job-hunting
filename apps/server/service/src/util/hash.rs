use sha2::{Digest, Sha256};

pub fn company_name_convert(name: &str) -> String {
    name.replace('（', "(").replace('）', ")")
}

pub fn gen_sha256(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    hex::encode(hasher.finalize())
}

pub fn gen_company_id(company_name: &str) -> String {
    let converted = company_name_convert(company_name);
    gen_sha256(&converted)
}

pub fn gen_bytes_sha256(value: &Vec<u8>) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value);
    hex::encode(hasher.finalize())
}

pub fn gen_add_or_update_uri(
    _principal_name: &str,
    _version: usize,
    csv_data: &[Vec<String>],
) -> String {
    let csv_content: String = csv_data
        .iter()
        .map(|row| row.join(","))
        .collect::<Vec<_>>()
        .join("\n");
    let hash = gen_sha256(&csv_content);
    format!("data://{}@system/{}", _principal_name, hash)
}
