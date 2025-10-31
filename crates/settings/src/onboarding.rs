use std::collections::HashMap;

use serde::{Deserialize, Deserializer, Serialize};

#[derive(Debug, Clone, Hash, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OnboardingStep {
    Alchemy,
    Etherscan,
    Wallet,
    Extension,
    Foundry,
}

const STEP_COUNT: usize = 5;

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Onboarding {
    #[serde(skip_deserializing)]
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

    pub(crate) fn finish_step(&mut self, step: OnboardingStep) {
        self.steps.insert(step, true);
        self.hidden = self.is_all_finished();
    }

    pub(crate) fn finish(&mut self) {
        self.steps.insert(OnboardingStep::Extension, true);
        self.steps.insert(OnboardingStep::Wallet, true);
        self.steps.insert(OnboardingStep::Alchemy, true);
        self.steps.insert(OnboardingStep::Etherscan, true);
        self.steps.insert(OnboardingStep::Foundry, true);
        self.hidden = true;
    }

    pub(crate) fn is_step_finished(&self, step: OnboardingStep) -> bool {
        self.steps.get(&step).cloned().unwrap_or(false)
    }

    pub fn is_all_finished(&self) -> bool {
        self.steps.len() == STEP_COUNT && self.steps.values().all(|v| *v)
    }
}

// custom deserializer for Onboarding steps where
// hidden field gets set based on how many steps exist currently, not how many are in the file
// this allows us to add new steps and automatically un-hide the onboarding for existing users,
// revealing the new options automatically on new releases
impl<'de> Deserialize<'de> for Onboarding {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        #[derive(Deserialize, Debug)]
        #[serde(rename_all = "camelCase")]
        struct Raw {
            steps: HashMap<OnboardingStep, bool>,
        }

        let raw = Raw::deserialize(deserializer)?;
        let hidden = raw.steps.len() == STEP_COUNT && raw.steps.values().all(|v| *v);

        Ok(Onboarding {
            hidden,
            steps: raw.steps,
        })
    }
}
