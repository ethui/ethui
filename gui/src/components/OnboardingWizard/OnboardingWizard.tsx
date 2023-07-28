import { Box, Button, Stack, Typography } from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { useState } from "react";

import { useKeyPress } from "../../hooks";
import { useWizardForm } from "../../store/wizard";
import { Logo } from "../Logo";
import { OnboardingCarousel } from "./OnboardingCarousel";
import { steps } from "./Steps";

interface Props {
  closeOnboarding: () => void;
}

export function OnboardingWizard({ closeOnboarding }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const { alchemyApiKey } = useWizardForm();

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleClose = async () => {
    if (alchemyApiKey.isDirty) {
      await invoke("settings_set", {
        newSettings: { alchemyApiKey: alchemyApiKey.value },
      });
    }

    closeOnboarding();
  };

  useKeyPress(["ArrowRight"], { meta: true }, handleNext);

  useKeyPress(["ArrowLeft"], { meta: true }, handleBack);

  return (
    <Box px={3}>
      <Stack direction="row" py={1.5} spacing={1} alignItems="center">
        <Logo width={40} />
        <Typography>Iron Wallet</Typography>
      </Stack>
      <OnboardingCarousel
        steps={steps}
        activeStep={activeStep}
        handleClose={handleClose}
        handleNext={handleNext}
        handleBack={handleBack}
      />
      <Box textAlign="center">
        <Button
          variant="outlined"
          color="inherit"
          size="medium"
          onClick={handleClose}
        >
          {activeStep === steps.length - 1 ? "Close" : "Skip"}
        </Button>
      </Box>
    </Box>
  );
}
