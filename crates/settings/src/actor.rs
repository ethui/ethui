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
pub struct GetAll;

#[derive(Debug, Clone)]
pub struct GetAlias(pub ethui_types::Address);

#[derive(Debug, Clone)]
pub struct Save;

impl Message<GetAll> for SettingsActor {
    type Reply = SerializedSettings;

    async fn handle(
        &mut self,
        _msg: GetAll,
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
        ctx: &mut kameo::message::Context<Self, Self::Reply>,
    ) -> Self::Reply {
        match msg {
            Set::All(map) => {
                if let Some(v) = map.get("darkMode") {
                    self.settings.inner.dark_mode = serde_json::from_value(v.clone()).unwrap()
                }
                if let Some(v) = map.get("abiWatchPath") {
                    self.settings.inner.abi_watch_path = serde_json::from_value(v.clone()).unwrap()
                }
                if let Some(v) = map.get("alchemyApiKey") {
                    self.settings.inner.alchemy_api_key = serde_json::from_value(v.clone()).unwrap()
                }
                if let Some(v) = map.get("etherscanApiKey") {
                    self.settings.inner.etherscan_api_key =
                        serde_json::from_value(v.clone()).unwrap()
                }
                if let Some(v) = map.get("hideEmptyTokens") {
                    self.settings.inner.hide_empty_tokens =
                        serde_json::from_value(v.clone()).unwrap()
                }
                if let Some(v) = map.get("autostart") {
                    self.settings.inner.autostart = serde_json::from_value(v.clone()).unwrap();
                    crate::autostart::update(self.settings.inner.autostart)?;
                }
                if let Some(v) = map.get("startMinimized") {
                    self.settings.inner.start_minimized =
                        serde_json::from_value(v.clone()).unwrap();
                }
                if let Some(v) = map.get("fastMode") {
                    self.settings.inner.fast_mode = serde_json::from_value(v.clone()).unwrap();
                }
                if let Some(v) = map.get("rustLog") {
                    self.settings.inner.rust_log = serde_json::from_value(v.clone()).unwrap();
                    ethui_tracing::parse(&self.settings.inner.rust_log)?;
                }
            }
            Set::DarkMode(mode) => {
                self.settings.inner.dark_mode = mode;
            }
            Set::FastMode(mode) => {
                self.settings.inner.fast_mode = mode;
            }

            Set::FinishOnboardingStep(step) => {
                self.settings.inner.onboarding.finish_step(step);
            }
            Set::FinishOnboarding => {
                self.settings.inner.onboarding.finish();
            }
            Set::Alias(address, alias) => {
                let alias = alias.map(|v| v.trim().to_owned()).filter(|v| !v.is_empty());
                if let Some(alias) = alias {
                    self.settings.inner.aliases.insert(address, alias);
                } else {
                    self.settings.inner.aliases.remove(&address);
                }
            }
        }

        // trigger a file save
        let _ = ctx.actor_ref().tell(Save).await;

        Ok(())
    }
}

impl Message<Save> for SettingsActor {
    type Reply = color_eyre::Result<()>;

    async fn handle(
        &mut self,
        _msg: Save,
        _ctx: &mut kameo::message::Context<Self, Self::Reply>,
    ) -> Self::Reply {
        self.settings.save().await
    }
}

impl Message<GetAlias> for SettingsActor {
    type Reply = Option<String>;

    async fn handle(
        &mut self,
        msg: GetAlias,
        _ctx: &mut kameo::message::Context<Self, Self::Reply>,
    ) -> Self::Reply {
        self.settings.inner.aliases.get(&msg.0).cloned()
    }
}
