use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Hash, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OnboardingStep {
    Alchemy,
    Wallet,
    Extension,
}

const STEP_COUNT: usize = 3;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Onboarding {
    pub(crate) hidden: bool,
    pub(crate) steps: HashMap<OnboardingStep, bool>,
}

impl Onboarding {
    pub(crate) fn all_done() -> Self {
        Self {
            hidden: true,
            steps: Default::default(),
        }
    }

    pub(crate) fn hide(&mut self) {
        self.hidden = true;
    }

    pub(crate) fn finish_step(&mut self, step: OnboardingStep) {
        self.steps.insert(step, true);

        if self.is_all_done() {
            self.hidden = true;
        }
    }

    pub(crate) fn finish(&mut self) {
        self.steps.insert(OnboardingStep::Extension, true);
        self.steps.insert(OnboardingStep::Wallet, true);
        self.steps.insert(OnboardingStep::Alchemy, true);
        self.hidden = true;
    }

    pub(crate) fn is_step_finished(&self, step: OnboardingStep) -> bool {
        self.steps.get(&step).cloned().unwrap_or(false)
    }

    pub(crate) fn is_all_done(&self) -> bool {
        self.steps.len() == STEP_COUNT && self.steps.values().all(|v| *v)
    }
}
