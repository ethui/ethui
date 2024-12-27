use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct Permission {
    invoker: String,
    parent_capability: String,
    caveats: Vec<Caveat>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Caveat {
    r#type: String,
    value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize)]
pub struct PermissionRequest {
    name: String,
}
