use gix_hash::ObjectId;
use gix_object::compute_hash;
use gix_pack::data;
use gix_packetline::{
    PacketLineRef,
    blocking_io::{StreamingPeekableIter, Writer, encode},
};
use std::collections::HashMap;
use std::io::Write;
use std::path::PathBuf;

pub async fn ls_tree() {}

pub async fn ls_refs(
    url: &str,
    ref_prefix: &str,
    token: Option<&str>,
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

    let mut req = reqwest::Client::new()
        .post(format!("{}/git-upload-pack", url))
        .header("Accept", "application/x-git-upload-pack-advertisement")
        .header("Content-Type", "application/x-git-upload-pack-request")
        .header("Git-Protocol", "version=2")
        .body(body);
    if let Some(t) = token {
        req = req.header("Authorization", format!("Bearer {}", t));
    }
    let response = req.send().await?;

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

pub async fn fetch_without_blobs(
    url: &str,
    commit_hash: &str,
    token: Option<&str>,
) -> anyhow::Result<HashMap<ObjectId, Vec<u8>>> {
    let mut writer = Writer::new(Vec::new());
    writer.enable_text_mode();
    writer.write_all(b"command=fetch")?;
    writer.write_all(b"agent=git/2.37.3")?;
    writer.write_all(b"object-format=sha1")?;
    encode::delim_to_write(writer.inner_mut())?;
    writer.write_all(format!("want {}", commit_hash).as_bytes())?;
    writer.write_all(b"filter blob:none")?;
    writer.write_all(format!("shallow {}", commit_hash).as_bytes())?;
    writer.write_all(b"deepen 1")?;
    writer.write_all(b"done")?;
    encode::flush_to_write(writer.inner_mut())?;
    let body = writer.into_inner();

    let mut req = reqwest::Client::new()
        .post(format!("{}/git-upload-pack", url))
        .header("Accept", "application/x-git-upload-pack-result")
        .header("Content-Type", "application/x-git-upload-pack-request")
        .header("Git-Protocol", "version=2")
        .body(body);
    if let Some(t) = token {
        req = req.header("Authorization", format!("Bearer {}", t));
    }
    let response = req.send().await?;
    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        anyhow::bail!("invalid response status {}: {}", status, body);
    }
    let response_bytes = response.bytes().await?;

    let mut reader =
        StreamingPeekableIter::new(&response_bytes[..], &[PacketLineRef::Flush], false);
    let mut packfile = Vec::new();

    while let Some(line) = reader.read_line() {
        let line = line??;
        if let PacketLineRef::Data(data) = line {
            if data.is_empty() {
                continue;
            }
            match data[0] {
                1 => packfile.extend_from_slice(&data[1..]),
                2 => {}
                3 => anyhow::bail!("{}", String::from_utf8_lossy(&data[1..])),
                _ => {
                    if let Ok(text) = std::str::from_utf8(data) {
                        if let Some(stripped) = text.strip_prefix("ERR ") {
                            anyhow::bail!("server error: {}", stripped);
                        }
                        if text.starts_with("nak") {
                            anyhow::bail!("server NAK: commit {} not found", commit_hash);
                        }
                    }
                }
            }
        }
    }

    if packfile.is_empty() {
        anyhow::bail!("empty packfile from server");
    }

    let pack = data::File::from_data(&packfile[..], PathBuf::new(), gix_hash::Kind::Sha1)?;
    let mut objects = HashMap::new();
    let mut offset: u64 = 12;
    let num_objects = pack.num_objects();
    let mut inflate = gix_features::zlib::Inflate::default();
    let mut out = Vec::new();

    for _ in 0..num_objects {
        let entry = pack.entry(offset)?;
        let decompressed_size = entry.decompressed_size as usize;
        out.clear();
        out.resize(decompressed_size, 0);
        let consumed = pack.decompress_entry(&entry, &mut inflate, &mut out)?;

        if !entry.header.is_delta() {
            let kind = entry.header.as_kind().expect("non-delta entry");
            let oid = compute_hash(gix_hash::Kind::Sha1, kind, &out)?;
            objects.insert(oid, out.clone());
        }

        offset = entry.data_offset + consumed as u64;
    }

    Ok(objects)
}

pub async fn resolve_paths() {}
