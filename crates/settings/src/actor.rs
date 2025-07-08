use std::{
    fs::File,
    path::{Path, PathBuf},
};

use ethui_types::prelude::*;
use kameo::{actor::ActorRef, message::Message, prelude::Context, Actor, Reply};

use crate::{migrations::load_and_migrate, onboarding::OnboardingStep, DarkMode, Settings};

#[derive(Debug)]
pub struct SettingsActor {
    inner: Settings,
    file: PathBuf,
}

pub async fn ask<M>(msg: M) -> Result<<<SettingsActor as Message<M>>::Reply as Reply>::Ok>
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

pub async fn tell<M>(msg: M) -> Result<()>
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
    pub async fn new(file: PathBuf) -> Result<Self> {
        let inner = if file.exists() {
            load_and_migrate(&file).await?
        } else {
            Settings::default()
        };

        let ret = Self { inner, file };

        // Save immediately after instantiation to persist any migrations
        ret.save().await?;

        // make sure OS's autostart is synced with settings
        crate::autostart::update(ret.inner.autostart)?;
        ethui_tracing::reload(&ret.inner.rust_log)?;

        Ok(ret)
    }

    #[instrument(skip(self), level = "trace")]
    async fn save(&self) -> Result<()> {
        let pathbuf = self.file.clone();
        let path = Path::new(&pathbuf);
        let file = File::create(path)?;

        ethui_tracing::reload(&self.inner.rust_log)?;
        serde_json::to_writer_pretty(file, &self.inner)?;
        ethui_broadcast::settings_updated().await;
        ethui_broadcast::ui_notify(UINotify::SettingsChanged).await;

        Ok(())
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

impl Message<GetAll> for SettingsActor {
    type Reply = Settings;

    async fn handle(&mut self, _msg: GetAll, _ctx: &mut Context<Self, Settings>) -> Self::Reply {
        self.inner.clone()
    }
}

impl Message<Set> for SettingsActor {
    type Reply = Result<()>;

    #[instrument(skip(self, ctx), level = "trace")]
    async fn handle(&mut self, msg: Set, ctx: &mut Context<Self, Self::Reply>) -> Self::Reply {
        match msg {
            Set::All(map) => {
                if let Some(v) = map.get("darkMode") {
                    self.inner.dark_mode = serde_json::from_value(v.clone()).unwrap()
                }
                if let Some(v) = map.get("abiWatchPath") {
                    self.inner.abi_watch_path = serde_json::from_value(v.clone()).unwrap()
                }

                if let Some(v) = map.get("alchemyApiKey") {
                    // check onboarding step
                    if !self
                        .inner
                        .onboarding
                        .is_step_finished(OnboardingStep::Alchemy)
                    {
                        let _ = ctx
                            .actor_ref()
                            .tell(Set::FinishOnboardingStep(OnboardingStep::Alchemy))
                            .await;
                    }
                    self.inner.alchemy_api_key = serde_json::from_value(v.clone()).unwrap()
                }

                if let Some(v) = map.get("etherscanApiKey") {
                    if !self
                        .inner
                        .onboarding
                        .is_step_finished(OnboardingStep::Etherscan)
                    {
                        let _ = ctx
                            .actor_ref()
                            .tell(Set::FinishOnboardingStep(OnboardingStep::Etherscan))
                            .await;
                    }
                    self.inner.etherscan_api_key = serde_json::from_value(v.clone()).unwrap()
                }

                if let Some(v) = map.get("hideEmptyTokens") {
                    self.inner.hide_empty_tokens = serde_json::from_value(v.clone()).unwrap()
                }
                if let Some(v) = map.get("autostart") {
                    self.inner.autostart = serde_json::from_value(v.clone()).unwrap();
                    crate::autostart::update(self.inner.autostart)?;
                }
                if let Some(v) = map.get("startMinimized") {
                    self.inner.start_minimized = serde_json::from_value(v.clone()).unwrap();
                }
                if let Some(v) = map.get("fastMode") {
                    self.inner.fast_mode = serde_json::from_value(v.clone()).unwrap();
                }
                if let Some(v) = map.get("rustLog") {
                    self.inner.rust_log = serde_json::from_value(v.clone()).unwrap();
                    ethui_tracing::parse(&self.inner.rust_log)?;
                }
            }
            Set::DarkMode(mode) => {
                self.inner.dark_mode = mode;
            }
            Set::FastMode(mode) => {
                self.inner.fast_mode = mode;
            }

            Set::FinishOnboardingStep(step) => {
                self.inner.onboarding.finish_step(step);
            }
            Set::FinishOnboarding => {
                self.inner.onboarding.finish();
            }
            Set::Alias(address, alias) => {
                let alias = alias.map(|v| v.trim().to_owned()).filter(|v| !v.is_empty());
                if let Some(alias) = alias {
                    self.inner.aliases.insert(address, alias);
                } else {
                    self.inner.aliases.remove(&address);
                }
            }
        }

        self.save().await?;
        // trigger a file save
        // let _ = ctx.actor_ref().tell(Save).try_send();

        Ok(())
    }
}

impl Message<GetAlias> for SettingsActor {
    type Reply = Option<String>;

    async fn handle(
        &mut self,
        GetAlias(address): GetAlias,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        self.inner.aliases.get(&address).cloned()
    }
}
