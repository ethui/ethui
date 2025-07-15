use std::path::PathBuf;

use color_eyre::eyre::Context as _;
use ethui_broadcast::InternalMsg;
use kameo::actor::ActorRef;

use crate::{actor::SettingsActor, onboarding::OnboardingStep, Set};

pub async fn init(pathbuf: PathBuf) -> color_eyre::Result<()> {
    let actor = kameo::spawn(SettingsActor::new(pathbuf).await?);
    actor
        .register("settings")
        .wrap_err_with(|| "Actor spawn error")?;

    tokio::spawn(receiver(actor));

    Ok(())
}

async fn receiver(actor: ActorRef<SettingsActor>) -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    let mut extension_updated = false;
    let mut wallet_created = false;

    loop {
        match rx.recv().await {
            Ok(InternalMsg::WalletCreated) if !wallet_created => {
                let _ = actor
                    .tell(Set::FinishOnboardingStep(OnboardingStep::Wallet))
                    .await;
                wallet_created = true;
            }

            Ok(InternalMsg::PeerAdded) if !extension_updated => {
                let _ = actor
                    .tell(Set::FinishOnboardingStep(OnboardingStep::Extension))
                    .await;
                extension_updated = true;
            }
            _ => (),
        }
    }
}
