use gix_packetline::{
    blocking_io::{encode, StreamingPeekableIter, Writer},
    PacketLineRef,
};
use std::collections::HashMap;
use std::io::Write;

pub async fn ls_tree() {}

pub async fn ls_refs(
    url: &str,
    ref_prefix: &str,
) -> Result<HashMap<String, String>, anyhow::Error> {
    let mut writer = Writer::new(Vec::new());
    writer.enable_text_mode();
    writer.write_all(b"command=ls-refs")?;
    writer.write_all(b"agent=git/2.37.3")?;
    writer.write_all(b"object-format=sha1")?;
    encode::delim_to_write(writer.inner_mut())?;
    writer.write_all(b"peel")?;
    writer.write_all(format!("ref-prefix {}", ref_prefix).as_bytes())?;
    encode::flush_to_write(writer.inner_mut())?;
    let body = writer.into_inner();

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/git-upload-pack", url))
        .header("Accept", "application/x-git-upload-pack-advertisement")
        .header("Content-Type", "application/x-git-upload-pack-request")
        .header("Git-Protocol", "version=2")
        .body(body)
        .send()
        .await?;

    let status = response.status();
    if !status.is_success() {
        anyhow::bail!("invalid response status {}", status);
    }
    let response_bytes = response.bytes().await?;

    let mut result = HashMap::new();
    let mut reader =
        StreamingPeekableIter::new(&response_bytes[..], &[PacketLineRef::Flush], false);
    while let Some(line) = reader.read_line() {
        let line = line??;
        if let PacketLineRef::Data(data) = line
            && let Ok(text) = std::str::from_utf8(data)
            && let Some((hash, name)) = text.trim_end().split_once(' ')
        {
            result.insert(name.to_string(), hash.to_string());
        }
    }
    Ok(result)
}

pub async fn fetch_without_blobs(url: &str, commit_hash: &str) {
    todo!()
}

pub async fn resolve_paths() {}
