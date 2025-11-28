use ethui_types::prelude::*;
use kameo::actor::ActorRef;

use crate::{DarkMode, Settings, onboarding::OnboardingStep};

use super::{Set, SetValue, SettingsActor};

#[allow(async_fn_in_trait)]
pub trait SettingsActorExt {
    async fn get_all(&self) -> Result<Settings>;
    async fn get_alias(&self, address: Address) -> Result<Option<String>>;
    async fn set_all(&self, map: serde_json::Map<String, serde_json::Value>) -> Result<()>;
    async fn set_dark_mode(&self, mode: DarkMode) -> Result<()>;
    async fn set_fast_mode(&self, mode: bool) -> Result<()>;
    async fn finish_onboarding(&self) -> Result<()>;
    async fn finish_onboarding_step(&self, step: OnboardingStep) -> Result<()>;
    async fn set_alias(&self, address: Address, alias: Option<String>) -> Result<()>;
    async fn set_run_local_stacks(&self, enabled: bool) -> Result<()>;
}

impl SettingsActorExt for ActorRef<SettingsActor> {
    async fn get_all(&self) -> Result<Settings> {
        Ok(self.ask(super::GetAll).await?)
    }

    async fn get_alias(&self, address: Address) -> Result<Option<String>> {
        Ok(self.ask(super::GetAlias { address }).await?)
    }

    async fn set_all(&self, map: serde_json::Map<String, serde_json::Value>) -> Result<()> {
        self.ask(Set { value: SetValue::All(map) }).await?;
        Ok(())
    }

    async fn set_dark_mode(&self, mode: DarkMode) -> Result<()> {
        self.ask(Set { value: SetValue::DarkMode(mode) }).await?;
        Ok(())
    }

    async fn set_fast_mode(&self, mode: bool) -> Result<()> {
        self.ask(Set { value: SetValue::FastMode(mode) }).await?;
        Ok(())
    }

    async fn finish_onboarding(&self) -> Result<()> {
        self.ask(Set { value: SetValue::FinishOnboarding }).await?;
        Ok(())
    }

    async fn finish_onboarding_step(&self, step: OnboardingStep) -> Result<()> {
        self.tell(Set { value: SetValue::FinishOnboardingStep(step) }).await?;
        Ok(())
    }

    async fn set_alias(&self, address: Address, alias: Option<String>) -> Result<()> {
        self.ask(Set { value: SetValue::Alias(address, alias) }).await?;
        Ok(())
    }

    async fn set_run_local_stacks(&self, enabled: bool) -> Result<()> {
        self.tell(Set { value: SetValue::RunLocalStacks(enabled) }).await?;
        Ok(())
    }
}
