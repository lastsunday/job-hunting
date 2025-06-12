use serde::{Deserialize, Serialize};

use super::page_bo::PageBO;

#[derive(Default,Deserialize, Serialize,Debug)]
pub struct PageParamBO<T> {
    pub page: PageBO,
    pub param: Option<T>,
}
