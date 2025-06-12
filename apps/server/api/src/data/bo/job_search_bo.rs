use chrono::{DateTime, FixedOffset};
use serde::{Deserialize, Serialize};

#[derive(Default, Deserialize, Serialize, Debug)]
pub struct JobSearchBO {
    pub name: Option<String>,
    pub salary: Option<f32>,
    pub address: Option<String>,
    pub publish_datetime_start: Option<DateTime<FixedOffset>>,
    pub publish_datetime_end: Option<DateTime<FixedOffset>>,
    pub create_datetime_start: Option<DateTime<FixedOffset>>,
    pub create_datetime_end: Option<DateTime<FixedOffset>>,
}
