use serde::{Serialize, Deserialize};

#[derive(Default,Deserialize,Serialize,Debug)]
pub struct PageBO{
    pub page: u64,
    pub page_size: u64,
}
