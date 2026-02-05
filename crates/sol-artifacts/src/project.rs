use std::path::{Path, PathBuf};

/// Represents a discovered Solidity project
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Project {
    /// Root directory containing the project config file
    pub contracts_root: PathBuf,
    /// Git repository root, if found within 3 levels up
    pub git_root: Option<PathBuf>,
}

impl Project {
    /// Create a Project from a contracts root path, searching up to 3 levels for .git
    pub fn from_contracts_root(contracts_root: PathBuf) -> Self {
        let git_root = Self::find_git_root(&contracts_root);
        Self {
            contracts_root,
            git_root,
        }
    }

    /// Search up to 3 levels above the contracts root for a .git directory
    fn find_git_root(contracts_root: &Path) -> Option<PathBuf> {
        let mut current = contracts_root;

        for _ in 0..3 {
            if current.join(".git").exists() {
                return Some(current.to_path_buf());
            }

            current = current.parent()?;
        }

        None
    }
}
