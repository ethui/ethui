use ethui_types::prelude::*;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct Permission {
    pub invoker: String,
    pub parent_capability: String,
    pub caveats: Vec<Caveat>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct Caveat {
    pub r#type: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PermissionRequest {
    methods: HashMap<String, HashMap<String, serde_json::Value>>,
}

impl PermissionRequest {
    pub fn into_permissions(self, invoker: String) -> impl Iterator<Item = Permission> {
        self.methods
            .into_iter()
            .map(move |(method, caveats)| Permission {
                invoker: invoker.clone(),
                parent_capability: method.to_string(),
                caveats: caveats
                    .into_iter()
                    .map(move |(caveat, value)| Caveat {
                        r#type: caveat.to_string(),
                        value: value.clone(),
                    })
                    .collect(),
            })
    }

    pub fn into_request_permissions_result(&self) -> Vec<RequestedPermission> {
        self.methods
            .keys()
            .map(|method| {
                let parent_capability = method.clone().to_string();
                let date = chrono::Utc::now().to_rfc3339();

                RequestedPermission {
                    parent_capability,
                    date,
                }
            })
            .collect()
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct RequestedPermission {
    pub parent_capability: String,
    pub date: String,
}
