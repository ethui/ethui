use std::path::PathBuf;

use color_eyre::eyre::Context as _;
use ethui_broadcast::InternalMsg;
use kameo::actor::ActorRef;

use crate::{
    Set,
    actor::{GetAll, Save, SettingsActor},
    onboarding::OnboardingStep,
};

pub async fn init(pathbuf: PathBuf) -> color_eyre::Result<()> {
    let actor = kameo::spawn(SettingsActor::new(pathbuf).await?);
    actor
        .register("settings")
        .wrap_err_with(|| "Actor spawn error")?;

    // Save immediately after instantiation to persist any migrations
    actor.tell(Save).await?;

    tokio::spawn(receiver(actor));

    Ok(())
}

async fn receiver(actor: ActorRef<SettingsActor>) -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        match rx.recv().await {
            Ok(InternalMsg::SettingsUpdated) => {
                // Get current settings to check onboarding status
                if let Ok(settings) = actor.ask(GetAll).await {
                    // check if onboarding->alchemy was finished
                    if !settings
                        .onboarding
                        .is_step_finished(OnboardingStep::Alchemy)
                        && settings.alchemy_api_key.is_some()
                    {
                        let _ = actor
                            .tell(Set::FinishOnboardingStep(OnboardingStep::Alchemy))
                            .await;
                    }

                    // check if onboarding->etherscan was finished
                    if !settings
                        .onboarding
                        .is_step_finished(OnboardingStep::Etherscan)
                        && settings.etherscan_api_key.is_some()
                    {
                        let _ = actor
                            .tell(Set::FinishOnboardingStep(OnboardingStep::Etherscan))
                            .await;
                    }
                }
            }

            Ok(InternalMsg::WalletCreated) => {
                let _ = actor
                    .tell(Set::FinishOnboardingStep(OnboardingStep::Wallet))
                    .await;
            }

            Ok(InternalMsg::PeerAdded) => {
                let _ = actor
                    .tell(Set::FinishOnboardingStep(OnboardingStep::Extension))
                    .await;
            }
            _ => (),
        }
    }
}
