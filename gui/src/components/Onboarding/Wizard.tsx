import { Box, Button } from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { useEffect, useState } from "react";

import { useInvoke, useKeyPress } from "@/hooks";
import { GeneralSettings } from "@/types";

import { OnboardingCarousel } from "./Carousel";
import { steps } from "./Steps";

interface Props {
  closeOnboarding: () => void;
}

export type WizardFormData = {
  alchemyApiKey?: string | null;
  createTestWallet: boolean;
  testMnemonic: string;
  addedHDWallet: boolean;
};

export function OnboardingWizard({ closeOnboarding }: Props) {
  const { data: settings } = useInvoke<GeneralSettings>("settings_get");

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<WizardFormData>({
    createTestWallet: true,
    testMnemonic: "test test test test test test test test test test test junk",
    addedHDWallet: false,
  });

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
    // TODO: desconstruir form data
    if (formData.alchemyApiKey !== settings?.alchemyApiKey) {
      await invoke("settings_set", {
        newSettings: { alchemyApiKey: formData.alchemyApiKey },
      });
    }

    if (formData.createTestWallet || !formData.addedHDWallet) {
      await invoke("wallets_create", {
        params: {
          type: "plaintext",
          name: "test wallet",
          mnemonic: formData.testMnemonic,
          derivationPath: "m/44'/60'/0'/0",
          count: 3,
        },
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
