import { Box, Button } from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { useEffect, useState } from "react";

import { GeneralSettings } from "@/types";

import { useInvoke, useKeyPress } from "./../../hooks";
import { OnboardingCarousel } from "./Carousel";
import { steps } from "./Steps";

interface Props {
  closeOnboarding: () => void;
}

export type WizardFormData = { alchemyApiKey?: string | null };

export function OnboardingWizard({ closeOnboarding }: Props) {
  const { data: settings } = useInvoke<GeneralSettings>("settings_get");

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<WizardFormData>({});

  useEffect(() => {
    setFormData((data) => ({
      ...data,
      alchemyApiKey: settings?.alchemyApiKey,
    }));
  }, [settings?.alchemyApiKey]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleClose = async () => {
    if (formData.alchemyApiKey !== settings?.alchemyApiKey) {
      await invoke("settings_set", {
        newSettings: { alchemyApiKey: formData.alchemyApiKey },
      });
    }

    closeOnboarding();
  };

  useKeyPress(["ArrowRight"], { meta: true }, handleNext);

  useKeyPress(["ArrowLeft"], { meta: true }, handleBack);

  return (
    <Box px={3}>
      <Box data-tauri-drag-region="true" pt={4}></Box>
      <OnboardingCarousel
        steps={steps}
        activeStep={activeStep}
        handleClose={handleClose}
        handleNext={handleNext}
        handleBack={handleBack}
        formData={formData}
        setFormData={setFormData}
      />
      <Box textAlign="center">
        <Button
          variant="outlined"
          color="inherit"
          size="medium"
          onClick={handleClose}
        >
          {activeStep === steps.length - 1 ? "Close" : "Skip Onboarding"}
        </Button>
      </Box>
    </Box>
  );
}
