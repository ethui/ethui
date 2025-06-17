use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StacksAuth {
    pub email: String,
    pub jwt: String,
}
