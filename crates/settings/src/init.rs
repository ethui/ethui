use std::path::PathBuf;

use ethui_broadcast::InternalMsg;
use kameo::actor::ActorRef;

use crate::{
    actor::{SettingsActor, GetSettings, FinishOnboardingStep},
    onboarding::OnboardingStep,
    Error, Result,
};

pub async fn init(pathbuf: PathBuf) -> Result<()> {
    let actor = kameo::spawn(SettingsActor::new(pathbuf).await?);
    actor.register("settings").map_err(|e| Error::ActorSpawn(format!("{}", e)))?;

    tokio::spawn(async move { receiver(actor).await });

    Ok(())
}

async fn receiver(actor: ActorRef<SettingsActor>) -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        match rx.recv().await {
            Ok(InternalMsg::SettingsUpdated) => {
                // Get current settings to check onboarding status
                if let Ok(settings) = actor.ask(GetSettings).await 
                {
                    // check if onboarding->alchemy was finished
                    if !settings.onboarding.is_step_finished(OnboardingStep::Alchemy)
                        && settings.alchemy_api_key.is_some()
                    {
                        let _ = actor.tell(FinishOnboardingStep(OnboardingStep::Alchemy)).await;
                    }

                    // check if onboarding->etherscan was finished
                    if !settings.onboarding.is_step_finished(OnboardingStep::Etherscan)
                        && settings.etherscan_api_key.is_some()
                    {
                        let _ = actor.tell(FinishOnboardingStep(OnboardingStep::Etherscan)).await;
                    }
                }
            }

            Ok(InternalMsg::WalletCreated) => {
                let _ = actor.tell(FinishOnboardingStep(OnboardingStep::Wallet)).await;
            }

            Ok(InternalMsg::PeerAdded) => {
                let _ = actor.tell(FinishOnboardingStep(OnboardingStep::Extension)).await;
            }
            _ => (),
        }
    }
}
