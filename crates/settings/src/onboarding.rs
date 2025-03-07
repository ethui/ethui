use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OnboardingStepState {
    #[default]
    Empty,
    Done,
    Skipped,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Onboarding {
    hidden: bool,
    create_wallet: OnboardingStepState,
    import_wallet: OnboardingStepState,
    create_token: OnboardingStepState,
    add_token: OnboardingStepState,
    add_network: OnboardingStepState,
}

impl Onboarding {
    pub(crate) fn all_done() -> Self {
        Self {
            hidden: true,
            create_wallet: OnboardingStepState::Done,
            import_wallet: OnboardingStepState::Done,
            create_token: OnboardingStepState::Done,
            add_token: OnboardingStepState::Done,
            add_network: OnboardingStepState::Done,
        }
    }

    pub(crate) fn hide(&mut self) {
        self.hidden = true;
    }
}
