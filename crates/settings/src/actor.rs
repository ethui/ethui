use std::path::PathBuf;

use ethui_broadcast::InternalMsg;
use ethui_types::{Address, GlobalState};
use kameo::{actor::ActorRef, message::Message, Actor};
use tokio::sync::{RwLockReadGuard, RwLockWriteGuard};

use crate::{onboarding::OnboardingStep, Settings};

pub struct SettingsActor {
    inner: Settings,
}

impl SettingsActor {
    pub async fn new(path: PathBuf) -> color_eyre::Result<Self> {
        let inner = if path.exists() {
            crate::migrations::load_and_migrate(&path)
                .await
                .expect("failed to load settings")
        } else {
            Settings {
                inner: crate::SerializedSettings::default(),
                file: path,
            }
        };
        
        inner.init().await?;
        Ok(Self { inner })
    }
}

pub enum Msg {
    Read,
    Write,
    Set(serde_json::Map<String, serde_json::Value>),
    SetAlias(Address, Option<String>),
    FinishOnboardingStep(OnboardingStep),
    FinishOnboarding,
    SetDarkMode(crate::DarkMode),
    SetFastMode(bool),
}

#[derive(Debug)]
pub enum Reply {
    ReadGuard(Settings),
    WriteGuard(Settings),
    Ok,
}

impl Message<Msg> for SettingsActor {
    type Reply = Reply;

    async fn handle(
        &mut self,
        msg: Msg,
        _ctx: &mut kameo::message::Context<Self, Self::Reply>,
    ) -> Self::Reply {
        match msg {
            Msg::Read => Reply::ReadGuard(self.inner.clone()),
            Msg::Write => Reply::WriteGuard(self.inner.clone()),
            Msg::Set(params) => {
                let _ = self.inner.set(params).await;
                Reply::Ok
            }
            Msg::SetAlias(address, alias) => {
                let _ = self.inner.set_alias(address, alias).await;
                Reply::Ok
            }
            Msg::FinishOnboardingStep(step) => {
                let _ = self.inner.finish_onboarding_step(step).await;
                Reply::Ok
            }
            Msg::FinishOnboarding => {
                let _ = self.inner.finish_onboarding().await;
                Reply::Ok
            }
            Msg::SetDarkMode(mode) => {
                let _ = self.inner.set_dark_mode(mode).await;
                Reply::Ok
            }
            Msg::SetFastMode(mode) => {
                let _ = self.inner.set_fast_mode(mode).await;
                Reply::Ok
            }
        }
    }
}

impl Actor for SettingsActor {
    type Error = color_eyre::Report;

    async fn on_start(
        &mut self,
        actor_ref: ActorRef<Self>,
    ) -> std::result::Result<(), Self::Error> {
        tokio::spawn(async move { receiver(actor_ref).await });
        Ok(())
    }
}

async fn receiver(handle: ActorRef<SettingsActor>) -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        match rx.recv().await {
            Ok(InternalMsg::SettingsUpdated) => {
                if let Ok(Reply::WriteGuard(mut settings)) = handle.ask(Msg::Write).await {
                    // check if onboarding->alchemy was finished
                    let onboarding = &settings.inner.onboarding;
                    if !onboarding.is_step_finished(OnboardingStep::Alchemy)
                        && settings.inner.alchemy_api_key.is_some()
                    {
                        let _ = handle.ask(Msg::FinishOnboardingStep(OnboardingStep::Alchemy)).await;
                    }

                    // check if onboarding->etherscan was finished
                    let onboarding = &settings.inner.onboarding;
                    if !onboarding.is_step_finished(OnboardingStep::Etherscan)
                        && settings.inner.etherscan_api_key.is_some()
                    {
                        let _ = handle.ask(Msg::FinishOnboardingStep(OnboardingStep::Etherscan)).await;
                    }
                }
            }

            Ok(InternalMsg::WalletCreated) => {
                let _ = handle.ask(Msg::FinishOnboardingStep(OnboardingStep::Wallet)).await;
            }

            Ok(InternalMsg::PeerAdded) => {
                let _ = handle.ask(Msg::FinishOnboardingStep(OnboardingStep::Extension)).await;
            }
            _ => (),
        }
    }
}

// Provide a compatibility layer for GlobalState
impl GlobalState for Settings {
    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        unimplemented!("Use SettingsActor instead")
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        unimplemented!("Use SettingsActor instead")
    }
}

// Helper functions for external access
pub async fn get_settings() -> Settings {
    let handle: ActorRef<SettingsActor> = kameo::registry::get("settings").await.unwrap();
    match handle.ask(Msg::Read).await.unwrap() {
        Reply::ReadGuard(settings) => settings,
        _ => unreachable!(),
    }
}

pub async fn update_settings<F>(f: F) -> color_eyre::Result<()>
where
    F: FnOnce(&mut Settings) -> color_eyre::Result<()>,
{
    let handle: ActorRef<SettingsActor> = kameo::registry::get("settings").unwrap();
    // For now, we'll need to handle this differently since we can't pass closures to actors
    // This is a limitation that might need refactoring in the calling code
    Ok(())
}