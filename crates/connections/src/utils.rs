use common::{Affinity, GlobalState};

use crate::Store;

// checks if a domain matches the given affinity
pub async fn affinity_matches(
    own_domain: Option<String>,
    other_domain: &Option<String>,
    affinity: Affinity,
) -> bool {
    use Affinity::*;

    let store = Store::read().await;

    match affinity {
        // if affinity is global/undefined, we match against any other global/undefined peer
        Unset | Global => {
            let current_affinity = own_domain.as_ref().map(|d| store.get_affinity(d));

            current_affinity
                .map(|a| a.is_unset() || a.is_global())
                .unwrap_or(true)
        }

        // if affinity is sticky, we only match against peers on the same domain
        Sticky(_) => own_domain == *other_domain,
    }
}
