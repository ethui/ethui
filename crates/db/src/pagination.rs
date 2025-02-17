use serde::Deserialize;

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Pagination {
    #[serde(default)]
    pub page: u32,
    #[serde(default = "default_page_size")]
    pub page_size: u32,
}

pub fn default_page_size() -> u32 {
    20
}

impl Pagination {
    pub fn offset(&self) -> u32 {
        self.page_size * self.page
    }
}

impl Default for Pagination {
    fn default() -> Self {
        Self {
            page: 0,
            page_size: 20,
        }
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Paginated<T> {
    pub pagination: Pagination,
    pub items: Vec<T>,
    pub last: bool,
    pub total: u32,
}

impl<T> Paginated<T> {
    pub fn new(items: Vec<T>, pagination: Pagination, total: u32) -> Self {
        let last = pagination.offset() + items.len() as u32 >= total;
        Self {
            items,
            pagination,
            total,
            last,
        }
    }
}

#[derive(Deserialize, Debug, Default, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TxIdx {
    pub block_number: u64,
    pub position: u64,
}
