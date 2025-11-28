mod ext;

use std::{
    fs::File,
    ops::ControlFlow,
    path::{Path, PathBuf},
};

use ethui_types::prelude::*;
use kameo::prelude::*;

use crate::{
    DarkMode, Settings, migrations::load_and_migrate, onboarding::OnboardingStep,
    test_alchemy_api_key, utils::test_etherscan_api_key,
};

pub use ext::SettingsActorExt;

#[derive(Debug)]
pub struct SettingsActor {
    inner: Settings,
    file: PathBuf,
}

pub fn settings() -> ActorRef<SettingsActor> {
    try_settings().expect("settings actor not initialized")
}

pub fn try_settings() -> color_eyre::Result<ActorRef<SettingsActor>> {
    ActorRef::<SettingsActor>::lookup("settings")?
        .ok_or_else(|| color_eyre::eyre::eyre!("settings actor not found"))
}

impl SettingsActor {
    pub async fn new(file: PathBuf) -> color_eyre::Result<Self> {
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
    async fn save(&self) -> color_eyre::Result<()> {
        let pathbuf = self.file.clone();
        let path = Path::new(&pathbuf);
        let file = File::create(path)?;

        serde_json::to_writer_pretty(file, &self.inner)?;
        ethui_broadcast::settings_updated().await;
        ethui_broadcast::ui_notify(UINotify::SettingsChanged).await;

        Ok(())
    }
}

impl Actor for SettingsActor {
    type Args = PathBuf;
    type Error = color_eyre::Report;

    async fn on_start(args: Self::Args, _actor_ref: ActorRef<Self>) -> color_eyre::Result<Self> {
        Self::new(args).await
    }

    async fn on_panic(
        &mut self,
        _actor_ref: WeakActorRef<Self>,
        err: PanicError,
    ) -> color_eyre::Result<ControlFlow<ActorStopReason>> {
        error!("settings actor panic: {}", err);
        Ok(ControlFlow::Continue(()))
    }
}

#[derive(Debug, Clone)]
pub(crate) enum SetValue {
    All(serde_json::Map<String, serde_json::Value>),
    DarkMode(DarkMode),
    FastMode(bool),
    FinishOnboardingStep(OnboardingStep),
    FinishOnboarding,
    Alias(ethui_types::Address, Option<String>),
    RunLocalStacks(bool),
}

#[messages]
impl SettingsActor {
    #[message]
    fn get_all(&self) -> Settings {
        self.inner.clone()
    }

    #[message]
    fn get_alias(&self, address: ethui_types::Address) -> Option<String> {
        self.inner.aliases.get(&address).cloned()
    }

    #[message(ctx)]
    #[instrument(skip(self, ctx), level = "trace")]
    async fn set(
        &mut self,
        value: SetValue,
        ctx: &mut Context<Self, color_eyre::Result<()>>,
    ) -> color_eyre::Result<()> {
        match value {
            SetValue::All(map) => {
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
                            .tell(Set { value: SetValue::FinishOnboardingStep(OnboardingStep::Alchemy) })
                            .await;
                    }
                    let v: String = serde_json::from_value(v.clone()).unwrap();
                    let v: Option<String> = Some(v).filter(|s| !s.is_empty());
                    if let Some(ref str) = v {
                        test_alchemy_api_key(str).await?;
                    }
                    self.inner.alchemy_api_key = v;
                }

                if let Some(v) = map.get("etherscanApiKey") {
                    if !self
                        .inner
                        .onboarding
                        .is_step_finished(OnboardingStep::Etherscan)
                    {
                        let _ = ctx
                            .actor_ref()
                            .tell(Set { value: SetValue::FinishOnboardingStep(OnboardingStep::Etherscan) })
                            .await;
                    }
                    let v: String = serde_json::from_value(v.clone()).unwrap();
                    let v: Option<String> = Some(v).filter(|s| !s.is_empty());
                    if let Some(ref str) = v {
                        test_etherscan_api_key(str).await?;
                    }
                    self.inner.etherscan_api_key = v;
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
                    let value: String = serde_json::from_value(v.clone()).unwrap();
                    ethui_tracing::reload(&value)?;
                    self.inner.rust_log = value;
                }
                if let Some(v) = map.get("runLocalStacks") {
                    self.inner.run_local_stacks = serde_json::from_value(v.clone()).unwrap();
                }
            }
            SetValue::DarkMode(mode) => {
                self.inner.dark_mode = mode;
            }
            SetValue::FastMode(mode) => {
                self.inner.fast_mode = mode;
            }

            SetValue::FinishOnboardingStep(step) => {
                self.inner.onboarding.finish_step(step);
            }
            SetValue::FinishOnboarding => {
                self.inner.onboarding.finish();
            }
            SetValue::Alias(address, alias) => {
                let alias = alias.map(|v| v.trim().to_owned()).filter(|v| !v.is_empty());
                if let Some(alias) = alias {
                    self.inner.aliases.insert(address, alias);
                } else {
                    self.inner.aliases.remove(&address);
                }
            }
            SetValue::RunLocalStacks(mode) => {
                self.inner.run_local_stacks = mode;
            }
        }

        self.save().await?;

        Ok(())
    }
}
