use kameo::actor::ActorRef;

use crate::{DarkMode, Settings, onboarding::OnboardingStep};

use super::{GetAlias, GetAll, Set, SettingsActor};

#[allow(async_fn_in_trait)]
pub trait SettingsActorExt {
    async fn get_all(&self) -> color_eyre::Result<Settings>;
    async fn get_alias(&self, address: ethui_types::Address) -> color_eyre::Result<Option<String>>;
    async fn set_all(
        &self,
        map: serde_json::Map<String, serde_json::Value>,
    ) -> color_eyre::Result<()>;
    async fn set_dark_mode(&self, mode: DarkMode) -> color_eyre::Result<()>;
    async fn set_fast_mode(&self, mode: bool) -> color_eyre::Result<()>;
    async fn finish_onboarding(&self) -> color_eyre::Result<()>;
    async fn finish_onboarding_step(&self, step: OnboardingStep) -> color_eyre::Result<()>;
    async fn set_alias(
        &self,
        address: ethui_types::Address,
        alias: Option<String>,
    ) -> color_eyre::Result<()>;
    async fn set_run_local_stacks(&self, enabled: bool) -> color_eyre::Result<()>;
}

impl SettingsActorExt for ActorRef<SettingsActor> {
    async fn get_all(&self) -> color_eyre::Result<Settings> {
        Ok(self.ask(GetAll).await?)
    }

    async fn get_alias(&self, address: ethui_types::Address) -> color_eyre::Result<Option<String>> {
        Ok(self.ask(GetAlias(address)).await?)
    }

    async fn set_all(
        &self,
        map: serde_json::Map<String, serde_json::Value>,
    ) -> color_eyre::Result<()> {
        self.ask(Set::All(map)).await?;
        Ok(())
    }

    async fn set_dark_mode(&self, mode: DarkMode) -> color_eyre::Result<()> {
        self.ask(Set::DarkMode(mode)).await?;
        Ok(())
    }

    async fn set_fast_mode(&self, mode: bool) -> color_eyre::Result<()> {
        self.ask(Set::FastMode(mode)).await?;
        Ok(())
    }

    async fn finish_onboarding(&self) -> color_eyre::Result<()> {
        self.ask(Set::FinishOnboarding).await?;
        Ok(())
    }

    async fn finish_onboarding_step(&self, step: OnboardingStep) -> color_eyre::Result<()> {
        self.tell(Set::FinishOnboardingStep(step)).await?;
        Ok(())
    }

    async fn set_alias(
        &self,
        address: ethui_types::Address,
        alias: Option<String>,
    ) -> color_eyre::Result<()> {
        self.ask(Set::Alias(address, alias)).await?;
        Ok(())
    }

    async fn set_run_local_stacks(&self, enabled: bool) -> color_eyre::Result<()> {
        self.tell(Set::RunLocalStacks(enabled)).await?;
        Ok(())
    }
}
