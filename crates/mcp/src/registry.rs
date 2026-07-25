//! The set of JSON-RPC methods the connected ethui actually serves.
//!
//! A port of `packages/mcp/src/rpc-registry.ts`. Prefers the live
//! `ethui_rpcMethods` list and falls back to [`crate::catalog`] when ethui
//! cannot be reached, marking the result as a guess.

use std::sync::Arc;

use serde_json::json;
use tokio::sync::Mutex;

use crate::{
    backend::Backend,
    catalog::{self, Kind, MethodMeta},
};

/// One method ethui serves, joined with whatever the catalog documents.
#[derive(Debug, Clone)]
pub struct Entry {
    pub name: String,
    /// `None` when ethui serves a method the catalog does not document.
    pub meta: Option<&'static MethodMeta>,
}

impl Entry {
    pub fn kind(&self) -> Option<Kind> {
        self.meta.map(|meta| meta.kind)
    }

    /// The `read` / `write` / `unimplemented` label, or `unknown` for a method
    /// ethui serves but the catalog has never heard of.
    pub fn kind_label(&self) -> &'static str {
        self.meta.map_or("unknown", |meta| meta.kind.as_str())
    }

    pub fn params(&self) -> &'static str {
        self.meta.map_or("(undocumented)", |meta| meta.params)
    }

    pub fn note(&self) -> Option<&'static str> {
        self.meta.and_then(|meta| meta.note)
    }

    fn documented(name: String) -> Self {
        let meta = catalog::meta(&name);
        Self { name, meta }
    }
}

/// What ethui serves, at one point in time.
#[derive(Debug, Clone)]
pub struct Snapshot {
    /// Sorted by name.
    pub entries: Vec<Entry>,
    /// Catalog methods this build does not serve. Empty unless `live`, since a
    /// fallback snapshot has nothing to compare against.
    pub stale: Vec<&'static str>,
    /// Whether this came from ethui (`true`) or the static catalog (`false`).
    pub live: bool,
}

impl Snapshot {
    pub fn contains(&self, method: &str) -> bool {
        self.entries.iter().any(|entry| entry.name == method)
    }
}

/// Fetches and caches the method list.
pub struct MethodRegistry<B: Backend> {
    backend: Arc<B>,
    cached: Mutex<Option<Arc<Snapshot>>>,
}

impl<B: Backend> MethodRegistry<B> {
    pub fn new(backend: Arc<B>) -> Self {
        Self {
            backend,
            cached: Mutex::new(None),
        }
    }

    /// The cached snapshot, fetching one if there is none.
    ///
    /// The lock is held across the fetch, so concurrent tool calls on a cold
    /// cache issue one request rather than racing. Handed back behind an `Arc`
    /// so a cache hit is a refcount bump rather than a deep copy of every
    /// entry's owned name.
    pub async fn snapshot(&self) -> Arc<Snapshot> {
        let mut cached = self.cached.lock().await;

        if let Some(snapshot) = cached.as_ref() {
            return snapshot.clone();
        }

        let snapshot = Arc::new(self.fetch().await);

        // A fallback snapshot is not the truth, only a guess — never memoize
        // it, so a later call can still reach a reconnected ethui.
        if snapshot.live {
            *cached = Some(snapshot.clone());
        }

        snapshot
    }

    /// Discard the cache and fetch again.
    pub async fn refresh(&self) -> Arc<Snapshot> {
        *self.cached.lock().await = None;
        self.snapshot().await
    }

    async fn fetch(&self) -> Snapshot {
        match self.live_names().await {
            Some(names) => Self::from_live(names),
            None => Self::from_catalog(),
        }
    }

    /// The method names ethui reports, or `None` if it cannot be asked or
    /// answers with something that is not a list of strings.
    async fn live_names(&self) -> Option<Vec<String>> {
        let value = self
            .backend
            .request("ethui_rpcMethods", json!([]))
            .await
            .ok()?;

        value
            .as_array()?
            .iter()
            .map(|name| name.as_str().map(str::to_owned))
            .collect()
    }

    fn from_live(mut names: Vec<String>) -> Snapshot {
        names.sort();
        names.dedup();

        let stale = catalog::names()
            .filter(|documented| !names.iter().any(|name| name == documented))
            .collect();

        Snapshot {
            entries: names.into_iter().map(Entry::documented).collect(),
            stale,
            live: true,
        }
    }

    fn from_catalog() -> Snapshot {
        Snapshot {
            entries: catalog::names()
                .map(|name| Entry::documented(name.to_owned()))
                .collect(),
            stale: Vec::new(),
            live: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;
    use crate::mock::{MockBackend, MockResponse};

    #[tokio::test]
    async fn asks_ethui_which_methods_it_serves() {
        let backend = Arc::new(MockBackend::returning(json!(["eth_chainId"])));
        let registry = MethodRegistry::new(backend.clone());

        registry.snapshot().await;

        assert_eq!(
            backend.calls(),
            vec![("ethui_rpcMethods".to_owned(), json!([]))]
        );
    }

    #[tokio::test]
    async fn a_live_snapshot_joins_catalog_metadata() {
        let backend = Arc::new(MockBackend::returning(json!(["eth_getBalance"])));
        let registry = MethodRegistry::new(backend);

        let snapshot = registry.snapshot().await;

        assert!(snapshot.live);
        assert_eq!(snapshot.entries.len(), 1);
        assert_eq!(snapshot.entries[0].kind(), Some(Kind::Read));
        assert_eq!(snapshot.entries[0].params(), "[address, blockTagOrNumber]");
    }

    #[tokio::test]
    async fn a_method_the_catalog_does_not_document_is_unknown_not_dropped() {
        let backend = Arc::new(MockBackend::returning(json!(["eth_futureThing"])));
        let registry = MethodRegistry::new(backend);

        let snapshot = registry.snapshot().await;

        assert_eq!(snapshot.entries.len(), 1);
        assert_eq!(snapshot.entries[0].kind_label(), "unknown");
        assert_eq!(snapshot.entries[0].params(), "(undocumented)");
    }

    #[tokio::test]
    async fn entries_are_sorted_by_name() {
        let backend = Arc::new(MockBackend::returning(json!([
            "eth_chainId",
            "eth_accounts"
        ])));
        let registry = MethodRegistry::new(backend);

        let snapshot = registry.snapshot().await;
        let names: Vec<_> = snapshot
            .entries
            .iter()
            .map(|entry| entry.name.as_str())
            .collect();

        assert_eq!(names, vec!["eth_accounts", "eth_chainId"]);
    }

    #[tokio::test]
    async fn a_documented_method_this_build_does_not_serve_is_reported_stale() {
        let backend = Arc::new(MockBackend::returning(json!(["eth_chainId"])));
        let registry = MethodRegistry::new(backend);

        let snapshot = registry.snapshot().await;

        assert!(
            snapshot.stale.contains(&"eth_getBalance"),
            "a catalog method absent from the live list is drift worth reporting"
        );
        assert!(!snapshot.stale.contains(&"eth_chainId"));
    }

    #[tokio::test]
    async fn an_unreachable_ethui_falls_back_to_the_static_catalog() {
        let backend = Arc::new(MockBackend::responding(MockResponse::Disconnected));
        let registry = MethodRegistry::new(backend);

        let snapshot = registry.snapshot().await;

        assert!(!snapshot.live);
        assert_eq!(snapshot.entries.len(), catalog::names().count());
        assert!(snapshot.contains("eth_chainId"));
    }

    #[tokio::test]
    async fn a_fallback_snapshot_reports_no_drift() {
        let backend = Arc::new(MockBackend::responding(MockResponse::Disconnected));
        let registry = MethodRegistry::new(backend);

        assert!(
            registry.snapshot().await.stale.is_empty(),
            "a guess cannot prove drift"
        );
    }

    #[tokio::test]
    async fn a_live_snapshot_is_cached() {
        let backend = Arc::new(MockBackend::returning(json!(["eth_chainId"])));
        let registry = MethodRegistry::new(backend.clone());

        registry.snapshot().await;
        registry.snapshot().await;

        assert_eq!(backend.calls().len(), 1);
    }

    #[tokio::test]
    async fn a_fallback_snapshot_is_never_cached() {
        let backend = Arc::new(MockBackend::responding(MockResponse::Disconnected));
        let registry = MethodRegistry::new(backend.clone());

        registry.snapshot().await;
        registry.snapshot().await;

        assert_eq!(
            backend.calls().len(),
            2,
            "a later call must still be able to reach a reconnected ethui"
        );
    }

    #[tokio::test]
    async fn refresh_discards_the_cache() {
        let backend = Arc::new(MockBackend::returning(json!(["eth_chainId"])));
        let registry = MethodRegistry::new(backend.clone());

        registry.snapshot().await;
        registry.refresh().await;

        assert_eq!(backend.calls().len(), 2);
    }

    #[tokio::test]
    async fn a_non_list_answer_falls_back_rather_than_failing() {
        let backend = Arc::new(MockBackend::returning(json!("not a list")));
        let registry = MethodRegistry::new(backend);

        let snapshot = registry.snapshot().await;

        assert!(!snapshot.live);
        assert_eq!(snapshot.entries.len(), catalog::names().count());
    }
}
