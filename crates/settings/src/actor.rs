use std::path::PathBuf;

use color_eyre::eyre::{Context as _, ContextCompat as _};
use kameo::{actor::ActorRef, message::Message, Actor, Reply};

use crate::{
    migrations::load_and_migrate, onboarding::OnboardingStep, DarkMode, SerializedSettings,
    Settings,
};

#[derive(Debug)]
pub struct SettingsActor {
    settings: Settings,
}

pub async fn ask<M>(
    msg: M,
) -> color_eyre::Result<<<SettingsActor as Message<M>>::Reply as Reply>::Ok>
where
    SettingsActor: Message<M>,
    M: Send + 'static + Sync,
    <<SettingsActor as Message<M>>::Reply as Reply>::Error: Sync + std::fmt::Display,
{
    let actor = ActorRef::<SettingsActor>::lookup("settings")?
        .wrap_err_with(|| "settings actor not found")?;

    // The function now directly uses the global actor reference.
    actor.ask(msg).await.wrap_err_with(|| "failed")
}

pub async fn tell<M>(msg: M) -> color_eyre::Result<()>
where
    SettingsActor: Message<M>,
    M: Send + 'static + Sync,
    <<SettingsActor as Message<M>>::Reply as Reply>::Error: Sync + std::fmt::Display,
{
    let actor = ActorRef::<SettingsActor>::lookup("settings")?
        .wrap_err_with(|| "settings actor not found")?;

    actor.tell(msg).await.map_err(Into::into)
}

impl SettingsActor {
    pub async fn new(pathbuf: PathBuf) -> color_eyre::Result<Self> {
        let settings = if pathbuf.exists() {
            load_and_migrate(&pathbuf).await?
        } else {
            Settings {
                inner: SerializedSettings::default(),
                file: pathbuf,
            }
        };

        settings.init().await?;

        Ok(Self { settings })
    }
}

impl Actor for SettingsActor {
    type Error = color_eyre::Report;
}

#[derive(Debug, Clone)]
pub enum Set {
    All(serde_json::Map<String, serde_json::Value>),
    DarkMode(DarkMode),
    FastMode(bool),
    FinishOnboardingStep(OnboardingStep),
    FinishOnboarding,
    Alias(ethui_types::Address, Option<String>),
}

#[derive(Debug, Clone)]
pub struct GetSettings;

#[derive(Debug, Clone)]
pub struct GetAlias(pub ethui_types::Address);

impl Message<GetSettings> for SettingsActor {
    type Reply = SerializedSettings;

    async fn handle(
        &mut self,
        _msg: GetSettings,
        _ctx: &mut kameo::message::Context<Self, Self::Reply>,
    ) -> Self::Reply {
        self.settings.inner.clone()
    }
}

impl Message<Set> for SettingsActor {
    type Reply = color_eyre::Result<()>;

    async fn handle(
        &mut self,
        msg: Set,
        _ctx: &mut kameo::message::Context<Self, Self::Reply>,
    ) -> Self::Reply {
        match msg {
            Set::All(map) => self.settings.set(map).await,
            Set::DarkMode(mode) => self.settings.set_dark_mode(mode).await,
            Set::FastMode(mode) => self.settings.set_fast_mode(mode).await,
            Set::FinishOnboardingStep(step) => self.settings.finish_onboarding_step(step).await,
            Set::FinishOnboarding => self.settings.finish_onboarding().await,
            Set::Alias(address, alias) => self.settings.set_alias(address, alias).await,
        }
    }
}

impl Message<GetAlias> for SettingsActor {
    type Reply = Option<String>;

    async fn handle(
        &mut self,
        msg: GetAlias,
        _ctx: &mut kameo::message::Context<Self, Self::Reply>,
    ) -> Self::Reply {
        self.settings.get_alias(msg.0)
    }
}
