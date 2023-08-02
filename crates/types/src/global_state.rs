use tokio::sync::{RwLockReadGuard, RwLockWriteGuard};

/// Defines a global state, distinguishing reads from writes
/// Meant to be declared as `OnceCell<RwLock<State>>` or `Lazy<RwLock<State>>`
#[async_trait::async_trait]
pub trait GlobalState {
    // /// initializees the global state
    // /// future read/write calls assume this has previously been called
    // async fn init(initializer: Self::Initializer);

    /// acquires a read-only handle to the global state
    async fn read<'a>() -> RwLockReadGuard<'a, Self>;

    /// acquires an exclusive write handle to the global state
    async fn write<'a>() -> RwLockWriteGuard<'a, Self>;
}
