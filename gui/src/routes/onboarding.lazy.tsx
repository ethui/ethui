import { Container, MobileStepper, Stack } from "@mui/material";
import { useState } from "react";
import { createLazyFileRoute } from "@tanstack/react-router";

import { DraggableToolbar, Logo } from "@/components";
import { AlchemyStep } from "@/components/Onboarding/Alchemy";
import { InstallExtensionStep } from "@/components/Onboarding/Extension";
import { ThankYouStep } from "@/components/Onboarding/ThankYou";
import { WelcomeStep } from "@/components/Onboarding/Welcome";
import { WalletSetupStep } from "@/components/Onboarding/WalletSetup";
import { StepProps } from "@/components/Onboarding";

export const Route = createLazyFileRoute("/onboarding")({
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
            steps={steps.length}
            position="static"
            activeStep={activeStep}
            nextButton={<></>}
            backButton={<></>}
          />
        </Stack>
      </Container>
    </>
  );
}
