import { Container, MobileStepper, Stack } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { DraggableToolbar, Logo } from "#/components";
import type { StepProps } from "#/components/Onboarding";
import { AlchemyStep } from "#/components/Onboarding/Alchemy";
import { InstallExtensionStep } from "#/components/Onboarding/Extension";
import { ThankYouStep } from "#/components/Onboarding/ThankYou";
import { WalletSetupStep } from "#/components/Onboarding/WalletSetup";
import { WelcomeStep } from "#/components/Onboarding/Welcome";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

export const steps: { component: React.FC<StepProps> }[] = [
  { component: WelcomeStep },
  { component: AlchemyStep },
  { component: WalletSetupStep },
  { component: InstallExtensionStep },
  { component: ThankYouStep },
];

export type WizardFormData = { alchemyApiKey?: string | null };

export function Onboarding() {
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const step = steps[activeStep];

  return (
    <>
      <DraggableToolbar />
      <Container disableGutters sx={{ px: 2 }}>
        <Stack alignItems="center">
          <Logo width={40} />
          <step.component onSubmit={handleNext} />

          <MobileStepper
            steps={Object.keys(steps).length}
            position="static"
            activeStep={activeStep}
            backButton={null}
            nextButton={null}
          />
        </Stack>
      </Container>
    </>
  );
}
