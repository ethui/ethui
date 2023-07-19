pub mod commands;
mod error;
mod global;
mod network;

use std::{
    collections::HashMap,
    fs::File,
    path::{Path, PathBuf},
};

use ethers::providers::{Http, Provider};
use iron_db::DB;
use iron_types::GlobalState;
use serde::Serialize;
use tokio::sync::mpsc;

pub use self::error::{Error, Result};
pub use self::network::Network;
use crate::{app, peers::Peers};

#[derive(Debug, Clone, Serialize)]
pub struct Networks {
    pub current: String,
    pub networks: HashMap<String, Network>,

    #[serde(skip)]
    file: PathBuf,

    #[serde(skip)]
    window_snd: mpsc::UnboundedSender<app::Event>,

    #[serde(skip)]
    db: DB,
}

impl Networks {
    /// Changes the currently connected wallet
    ///
    /// Broadcasts `chainChanged`
    pub fn set_current_network(&mut self, new_current_network: String) -> Result<()> {
        let previous = self.get_current_network().chain_id;
        self.current = new_current_network;
        let new = self.get_current_network().chain_id;

        if previous != new {
            self.on_network_changed()?;
        }

        self.save()?;

        Ok(())
    }

    pub fn set_current_network_by_id(&mut self, new_chain_id: u32) -> Result<()> {
        let new_network = self
            .networks
            .values()
            .find(|n| n.chain_id == new_chain_id)
            .unwrap();

        self.set_current_network(new_network.name.clone())?;
        self.save()?;

        Ok(())
    }

    pub fn get_current_network(&self) -> &Network {
        if !self.networks.contains_key(&self.current) {
            return self.networks.values().next().unwrap();
        }

        &self.networks[&self.current]
    }

    pub fn set_networks(&mut self, networks: Vec<Network>) -> Result<()> {
        self.do_set_networks(networks)
    }

    pub fn reset_networks(&mut self) -> Result<()> {
        self.do_set_networks(Network::all_default())
    }

    pub fn get_current_provider(&self) -> Provider<Http> {
        self.get_current_network().get_provider()
    }

    fn on_network_changed(&self) -> Result<()> {
        self.notify_peers();
        self.window_snd.send(app::Notify::NetworkChanged.into())?;

        Ok(())
    }

    fn do_set_networks(&mut self, networks: Vec<Network>) -> Result<()> {
        let first = networks[0].name.clone();

        self.networks = networks.into_iter().map(|n| (n.name.clone(), n)).collect();

        if !self.networks.contains_key(&self.current) {
            self.current = first;
            self.on_network_changed()?;
        }

        self.save()
    }

    // broadcasts `accountsChanged` to all peers
    fn notify_peers(&self) {
        let current = self.get_current_network().clone();
        tokio::spawn(async move {
            Peers::read()
                .await
                .broadcast_chain_changed(current.chain_id, current.name)
        });
    }

    fn reset_listeners(&mut self) {
        let db = self.db.clone();

        for network in self.networks.values_mut() {
            network
                .reset_listener(db.clone(), self.window_snd.clone())
                .unwrap();
        }
    }

    // Persists current state to disk
    fn save(&self) -> Result<()> {
        let pathbuf = self.file.clone();
        let path = Path::new(&pathbuf);
        let file = File::create(path)?;

        serde_json::to_writer_pretty(file, self)?;

        Ok(())
    }
}
