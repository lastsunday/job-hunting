use std::{fmt::Display, str::FromStr};

use serde::{Deserialize, Deserializer};

#[derive(Deserialize)]
#[serde(untagged)]
enum StringOrNumber<T> {
    String(String),
    Number(T),
}

pub fn deserialize_number<'de, T, D>(deserializer: D) -> Result<T, D::Error>
where
    T: FromStr + Deserialize<'de>,
    T::Err: Display,
    D: Deserializer<'de>,
{
    match StringOrNumber::deserialize(deserializer)? {
        StringOrNumber::String(s) => s.parse().map_err(serde::de::Error::custom),
        StringOrNumber::Number(n) => Ok(n),
    }
}
