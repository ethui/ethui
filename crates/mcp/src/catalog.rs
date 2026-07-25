//! Static metadata for the JSON-RPC methods ethui serves.
//!
//! A port of `packages/mcp/src/rpc-catalog.ts`. It is documentation, not truth:
//! [`crate::registry`] prefers the live `ethui_rpcMethods` list and falls back
//! here only when the app cannot be reached.

/// What calling a method does.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    /// Answers from state; no dialog.
    Read,
    /// Changes state or signs. Most open an approval dialog.
    Write,
    /// Registered in ethui's handler but always errors.
    Unimplemented,
}

impl Kind {
    /// The lowercase name used in tool output and in `list_rpc_methods`'s
    /// `kind` filter.
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Read => "read",
            Self::Write => "write",
            Self::Unimplemented => "unimplemented",
        }
    }

    /// Parse the filter value an agent passes to `list_rpc_methods`.
    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "read" => Some(Self::Read),
            "write" => Some(Self::Write),
            "unimplemented" => Some(Self::Unimplemented),
            _ => None,
        }
    }
}

/// What the catalog knows about one method.
#[derive(Debug, Clone, Copy)]
pub struct MethodMeta {
    pub kind: Kind,
    /// The parameter shape, rendered for a human — not a JSON Schema.
    pub params: &'static str,
    /// A caveat the agent needs before calling.
    pub note: Option<&'static str>,
}

/// For [`Kind::Unimplemented`] methods that have a working substitute, the
/// method to call instead.
///
/// Structured rather than scraped back out of the prose in `note`: callers that
/// need the substitute get it as data, so no entry has to phrase its note a
/// particular way for them to work.
static REPLACEMENTS: &[(&str, &str)] = &[
    ("eth_gasPrice", "eth_estimateGas"),
    ("eth_signTransaction", "eth_sendTransaction"),
];

/// The method to call instead of `method`, if it is unimplemented and something
/// else does the job.
pub fn replacement(method: &str) -> Option<&'static str> {
    REPLACEMENTS
        .iter()
        .find(|(name, _)| *name == method)
        .map(|(_, substitute)| *substitute)
}

/// Sorted by name, so [`meta`] can binary-search and [`names`] needs no
/// sorting of its own. The `names_are_sorted_*` tests hold this true.
static METHODS: &[(&str, MethodMeta)] = &[
    (
        "eth_accounts",
        MethodMeta {
            kind: Kind::Read,
            params: "[]",
            note: None,
        },
    ),
    (
        "eth_blockNumber",
        MethodMeta {
            kind: Kind::Read,
            params: "[]",
            note: None,
        },
    ),
    (
        "eth_call",
        MethodMeta {
            kind: Kind::Read,
            params: "[txObject, blockTagOrNumber]",
            note: None,
        },
    ),
    (
        "eth_chainId",
        MethodMeta {
            kind: Kind::Read,
            params: "[]",
            note: None,
        },
    ),
    (
        "eth_estimateGas",
        MethodMeta {
            kind: Kind::Read,
            params: "[txObject]",
            note: None,
        },
    ),
    (
        "eth_gasPrice",
        MethodMeta {
            kind: Kind::Unimplemented,
            params: "[]",
            note: Some("registered but always errors; use eth_estimateGas instead"),
        },
    ),
    (
        "eth_getBalance",
        MethodMeta {
            kind: Kind::Read,
            params: "[address, blockTagOrNumber]",
            note: None,
        },
    ),
    (
        "eth_getBlockByHash",
        MethodMeta {
            kind: Kind::Read,
            params: "[blockHash, fullTxs]",
            note: None,
        },
    ),
    (
        "eth_getBlockByNumber",
        MethodMeta {
            kind: Kind::Read,
            params: "[blockTagOrNumber, fullTxs]",
            note: None,
        },
    ),
    (
        "eth_getBlockTransactionCountByHash",
        MethodMeta {
            kind: Kind::Read,
            params: "[blockHash]",
            note: None,
        },
    ),
    (
        "eth_getBlockTransactionCountByNumber",
        MethodMeta {
            kind: Kind::Read,
            params: "[blockTagOrNumber]",
            note: None,
        },
    ),
    (
        "eth_getCode",
        MethodMeta {
            kind: Kind::Read,
            params: "[address, blockTagOrNumber]",
            note: None,
        },
    ),
    (
        "eth_getFilterLogs",
        MethodMeta {
            kind: Kind::Read,
            params: "[filterIdHex]",
            note: None,
        },
    ),
    (
        "eth_getLogs",
        MethodMeta {
            kind: Kind::Read,
            params: "[filterObject]",
            note: None,
        },
    ),
    (
        "eth_getStorageAt",
        MethodMeta {
            kind: Kind::Read,
            params: "[address, slotHex, blockTagOrNumber]",
            note: None,
        },
    ),
    (
        "eth_getTransactionByBlockHashAndIndex",
        MethodMeta {
            kind: Kind::Read,
            params: "[blockHash, indexHex]",
            note: None,
        },
    ),
    (
        "eth_getTransactionByBlockNumberAndIndex",
        MethodMeta {
            kind: Kind::Read,
            params: "[blockTagOrNumber, indexHex]",
            note: None,
        },
    ),
    (
        "eth_getTransactionByHash",
        MethodMeta {
            kind: Kind::Read,
            params: "[txHash]",
            note: None,
        },
    ),
    (
        "eth_getTransactionCount",
        MethodMeta {
            kind: Kind::Read,
            params: "[address, blockTagOrNumber]",
            note: None,
        },
    ),
    (
        "eth_getTransactionReceipt",
        MethodMeta {
            kind: Kind::Read,
            params: "[txHash]",
            note: None,
        },
    ),
    (
        "eth_getUncleByBlockHashAndIndex",
        MethodMeta {
            kind: Kind::Read,
            params: "[blockHash, indexHex]",
            note: None,
        },
    ),
    (
        "eth_getUncleByBlockNumberAndIndex",
        MethodMeta {
            kind: Kind::Read,
            params: "[blockTagOrNumber, indexHex]",
            note: None,
        },
    ),
    (
        "eth_getUncleCountByBlockHash",
        MethodMeta {
            kind: Kind::Read,
            params: "[blockHash]",
            note: None,
        },
    ),
    (
        "eth_getUncleCountByBlockNumber",
        MethodMeta {
            kind: Kind::Read,
            params: "[blockTagOrNumber]",
            note: None,
        },
    ),
    (
        "eth_mining",
        MethodMeta {
            kind: Kind::Read,
            params: "[]",
            note: None,
        },
    ),
    (
        "eth_newBlockFilter",
        MethodMeta {
            kind: Kind::Read,
            params: "[]",
            note: Some("eth_getFilterChanges is NOT registered, so this filter cannot be polled"),
        },
    ),
    (
        "eth_newFilter",
        MethodMeta {
            kind: Kind::Read,
            params: "[filterObject]",
            note: Some(
                "filter ids are provider-scoped; a switch_network invalidates them. eth_getFilterChanges is NOT registered, so only eth_getFilterLogs can read this filter back",
            ),
        },
    ),
    (
        "eth_newPendingFilter",
        MethodMeta {
            kind: Kind::Read,
            params: "[]",
            note: Some(
                "nonstandard name; the standard method is eth_newPendingTransactionFilter, so the upstream provider will likely reject this",
            ),
        },
    ),
    (
        "eth_protocolVersion",
        MethodMeta {
            kind: Kind::Read,
            params: "[]",
            note: None,
        },
    ),
    (
        "eth_requestAccounts",
        MethodMeta {
            kind: Kind::Read,
            params: "[]",
            note: Some("same handler as eth_accounts; does not prompt"),
        },
    ),
    (
        "eth_sendRawTransaction",
        MethodMeta {
            kind: Kind::Write,
            params: "[signedTxHex]",
            note: Some("NO approval dialog — the payload is already signed"),
        },
    ),
    (
        "eth_sendTransaction",
        MethodMeta {
            kind: Kind::Write,
            params: "[txObject]",
            note: Some(
                "opens an approval dialog in the ethui app; may be rejected — skipped only under ethui's Fast Mode, which requires a dev wallet AND a dev network AND the setting enabled",
            ),
        },
    ),
    (
        "eth_sign",
        MethodMeta {
            kind: Kind::Write,
            params: "[hexMessage, address]",
            note: Some(
                "ethui expects [message, address], NOT the standard [address, data]; message must be 0x-hex-encoded — a non-hex message fails only after the approval dialog is accepted",
            ),
        },
    ),
    (
        "eth_signTransaction",
        MethodMeta {
            kind: Kind::Unimplemented,
            params: "[txObject]",
            note: Some("registered but always errors; use eth_sendTransaction instead"),
        },
    ),
    (
        "eth_signTypedData",
        MethodMeta {
            kind: Kind::Write,
            params: "[address, typedDataJsonString]",
            note: Some("typed data must be a JSON string, not an object"),
        },
    ),
    (
        "eth_signTypedData_v4",
        MethodMeta {
            kind: Kind::Write,
            params: "[address, typedDataJsonString]",
            note: Some("typed data must be a JSON string, not an object"),
        },
    ),
    (
        "eth_syncing",
        MethodMeta {
            kind: Kind::Read,
            params: "[]",
            note: None,
        },
    ),
    (
        "eth_uninstallFilter",
        MethodMeta {
            kind: Kind::Read,
            params: "[filterIdHex]",
            note: None,
        },
    ),
    (
        "ethui_forgeTestSubmitRun",
        MethodMeta {
            kind: Kind::Write,
            params: "[runParams]",
            note: Some("only registered when ethui is built with the forge-traces feature"),
        },
    ),
    (
        "ethui_getAddressAlias",
        MethodMeta {
            kind: Kind::Read,
            params: "[{ address }]",
            note: None,
        },
    ),
    (
        "ethui_getContractAbi",
        MethodMeta {
            kind: Kind::Read,
            params: "[{ address }]",
            note: None,
        },
    ),
    (
        "ethui_getProviderState",
        MethodMeta {
            kind: Kind::Read,
            params: "[]",
            note: None,
        },
    ),
    (
        "ethui_rpcMethods",
        MethodMeta {
            kind: Kind::Read,
            params: "[]",
            note: Some("the discovery method backing list_rpc_methods"),
        },
    ),
    (
        "metamask_getProviderState",
        MethodMeta {
            kind: Kind::Read,
            params: "[]",
            note: None,
        },
    ),
    (
        "net_listening",
        MethodMeta {
            kind: Kind::Unimplemented,
            params: "[]",
            note: Some("registered but always errors"),
        },
    ),
    (
        "net_peerCount",
        MethodMeta {
            kind: Kind::Unimplemented,
            params: "[]",
            note: Some("registered but always errors"),
        },
    ),
    (
        "net_version",
        MethodMeta {
            kind: Kind::Read,
            params: "[]",
            note: None,
        },
    ),
    (
        "personal_sign",
        MethodMeta {
            kind: Kind::Write,
            params: "[hexMessage, address]",
            note: Some(
                "opens an approval dialog — skipped only under ethui's Fast Mode, which requires a dev wallet AND a dev network AND the setting enabled; message must be 0x-hex-encoded — a non-hex message fails only after the approval dialog is accepted",
            ),
        },
    ),
    (
        "wallet_addEthereumChain",
        MethodMeta {
            kind: Kind::Write,
            params: "[chainParams]",
            note: None,
        },
    ),
    (
        "wallet_getPermissions",
        MethodMeta {
            kind: Kind::Read,
            params: "[]",
            note: None,
        },
    ),
    (
        "wallet_requestPermissions",
        MethodMeta {
            kind: Kind::Write,
            params: "[{ eth_accounts: {} }]",
            note: None,
        },
    ),
    (
        "wallet_revokePermissions",
        MethodMeta {
            kind: Kind::Write,
            params: "[{ eth_accounts: {} }]",
            note: None,
        },
    ),
    (
        "wallet_switchEthereumChain",
        MethodMeta {
            kind: Kind::Write,
            params: "[{ chainId: hexString }]",
            note: Some(
                "not session-scoped: under global affinity it moves ethui's network for \
                 everything, otherwise it persists a per-origin pin that survives restarts",
            ),
        },
    ),
    (
        "wallet_updateEthereumChain",
        MethodMeta {
            kind: Kind::Write,
            params: "[chainParams]",
            note: None,
        },
    ),
    (
        "wallet_watchAsset",
        MethodMeta {
            kind: Kind::Write,
            params: "[{ type, options }]",
            note: None,
        },
    ),
    (
        "web3_clientVersion",
        MethodMeta {
            kind: Kind::Unimplemented,
            params: "[]",
            note: Some("registered but always errors"),
        },
    ),
    (
        "web3_sha3",
        MethodMeta {
            kind: Kind::Unimplemented,
            params: "[dataHex]",
            note: Some("registered but always errors"),
        },
    ),
];

/// Look up a method, or `None` if the catalog does not document it.
pub fn meta(name: &str) -> Option<&'static MethodMeta> {
    METHODS
        .binary_search_by_key(&name, |(candidate, _)| candidate)
        .ok()
        .map(|index| &METHODS[index].1)
}

/// Every documented method name, sorted.
pub fn names() -> impl Iterator<Item = &'static str> {
    METHODS.iter().map(|(name, _)| *name)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn documents_a_provider_forwarded_read() {
        let meta = meta("eth_getBalance").unwrap();

        assert_eq!(meta.kind, Kind::Read);
        assert_eq!(meta.params, "[address, blockTagOrNumber]");
    }

    #[test]
    fn documents_a_write_with_its_approval_caveat() {
        let meta = meta("eth_sendTransaction").unwrap();

        assert_eq!(meta.kind, Kind::Write);
        assert!(
            meta.note.unwrap().contains("approval dialog"),
            "a write must warn about the dialog"
        );
    }

    #[test]
    fn documents_a_registered_but_unimplemented_method() {
        let meta = meta("eth_gasPrice").unwrap();

        assert_eq!(meta.kind, Kind::Unimplemented);
        assert!(meta.note.unwrap().contains("always errors"));
    }

    #[test]
    fn returns_nothing_for_an_undocumented_method() {
        assert!(meta("eth_madeUp").is_none());
    }

    #[test]
    fn names_are_sorted_so_lookup_can_binary_search() {
        let names: Vec<_> = names().collect();

        let mut sorted = names.clone();
        sorted.sort_unstable();

        assert_eq!(names, sorted);
    }

    #[test]
    fn names_are_unique() {
        let names: Vec<_> = names().collect();

        let mut deduped = names.clone();
        deduped.dedup();

        assert_eq!(names.len(), deduped.len());
    }

    #[test]
    fn covers_the_methods_the_curated_tools_depend_on() {
        for name in [
            "eth_accounts",
            "eth_chainId",
            "eth_getBalance",
            "eth_getTransactionByHash",
            "eth_call",
            "ethui_getContractAbi",
            "ethui_getAddressAlias",
            "ethui_rpcMethods",
            "wallet_switchEthereumChain",
        ] {
            assert!(meta(name).is_some(), "{name} must be documented");
        }
    }

    #[test]
    fn kind_round_trips_through_its_string_form() {
        for kind in [Kind::Read, Kind::Write, Kind::Unimplemented] {
            assert_eq!(Kind::parse(kind.as_str()), Some(kind));
        }
    }

    #[test]
    fn an_unknown_kind_filter_does_not_parse() {
        assert!(Kind::parse("banana").is_none());
    }
}
