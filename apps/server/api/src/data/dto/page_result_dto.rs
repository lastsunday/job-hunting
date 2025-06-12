use serde::{Deserialize, Serialize};

#[derive(Default,Deserialize, Serialize,Debug)]
pub struct PageResultDTO<T> {
    pub items: Vec<T>,
    pub total: u64,
}
