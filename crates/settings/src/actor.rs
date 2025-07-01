use std::path::PathBuf;

use kameo::{actor::ActorRef, message::Message, Actor};

use crate::{
    migrations::load_and_migrate, onboarding::OnboardingStep, DarkMode, Error, Result,
    SerializedSettings, Settings,
};

#[derive(Debug)]
pub struct SettingsActor {
    settings: Settings,
}

impl SettingsActor {
    pub async fn new(pathbuf: PathBuf) -> Result<Self> {
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
    type Error = Error;
}

#[derive(Debug, Clone)]
pub struct GetSettings;

#[derive(Debug, Clone)]
pub struct SetSettings(pub serde_json::Map<String, serde_json::Value>);

#[derive(Debug, Clone)]
pub struct SetDarkMode(pub DarkMode);

#[derive(Debug, Clone)]
pub struct SetFastMode(pub bool);

#[derive(Debug, Clone)]
pub struct FinishOnboardingStep(pub OnboardingStep);

#[derive(Debug, Clone)]
pub struct FinishOnboarding;

#[derive(Debug, Clone)]
pub struct GetAlias(pub ethui_types::Address);

#[derive(Debug, Clone)]
pub struct SetAlias(pub ethui_types::Address, pub Option<String>);


impl Message<GetSettings> for SettingsActor {
    type Reply = SerializedSettings;

    async fn handle(&mut self, _msg: GetSettings, _ctx: &mut kameo::message::Context<Self, Self::Reply>) -> Self::Reply {
        self.settings.inner.clone()
    }
}

impl Message<SetSettings> for SettingsActor {
    type Reply = Result<()>;

    async fn handle(&mut self, msg: SetSettings, _ctx: &mut kameo::message::Context<Self, Self::Reply>) -> Self::Reply {
        self.settings.set(msg.0).await
    }
}

impl Message<SetDarkMode> for SettingsActor {
    type Reply = Result<()>;

    async fn handle(&mut self, msg: SetDarkMode, _ctx: &mut kameo::message::Context<Self, Self::Reply>) -> Self::Reply {
        self.settings.set_dark_mode(msg.0).await
    }
}

impl Message<SetFastMode> for SettingsActor {
    type Reply = Result<()>;

    async fn handle(&mut self, msg: SetFastMode, _ctx: &mut kameo::message::Context<Self, Self::Reply>) -> Self::Reply {
        self.settings.set_fast_mode(msg.0).await
    }
}

impl Message<FinishOnboardingStep> for SettingsActor {
    type Reply = Result<()>;

    async fn handle(&mut self, msg: FinishOnboardingStep, _ctx: &mut kameo::message::Context<Self, Self::Reply>) -> Self::Reply {
        self.settings.finish_onboarding_step(msg.0).await
    }
}

impl Message<FinishOnboarding> for SettingsActor {
    type Reply = Result<()>;

    async fn handle(&mut self, _msg: FinishOnboarding, _ctx: &mut kameo::message::Context<Self, Self::Reply>) -> Self::Reply {
        self.settings.finish_onboarding().await
    }
}

impl Message<GetAlias> for SettingsActor {
    type Reply = Option<String>;

    async fn handle(&mut self, msg: GetAlias, _ctx: &mut kameo::message::Context<Self, Self::Reply>) -> Self::Reply {
        self.settings.get_alias(msg.0)
    }
}

impl Message<SetAlias> for SettingsActor {
    type Reply = Result<()>;

    async fn handle(&mut self, msg: SetAlias, _ctx: &mut kameo::message::Context<Self, Self::Reply>) -> Self::Reply {
        self.settings.set_alias(msg.0, msg.1).await
    }
}


pub async fn get_actor() -> Result<ActorRef<SettingsActor>> {
    ActorRef::<SettingsActor>::lookup("settings")
        .map_err(|e| Error::ActorSend(format!("{}", e)))?
        .ok_or(Error::ActorNotFound)
}