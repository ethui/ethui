import { Container, MobileStepper, Stack } from "@mui/material";
import { useState } from "react";
import { createLazyFileRoute } from "@tanstack/react-router";

import { DraggableToolbar } from "@/components";
import { AlchemyStep } from "@/components/Onboarding/Alchemy";
import { InstallExtensionStep } from "@/components/Onboarding/Extension";
import { ThankYouStep } from "@/components/Onboarding/ThankYou";
import { WelcomeStep } from "@/components/Onboarding/Welcome";

export const Route = createLazyFileRoute("/onboarding")({
  component: Onboarding,
});

export interface StepProps {
  onSubmit: () => unknown;
}

export const steps: { component: React.FC<StepProps> }[] = [
  { component: WelcomeStep },
  { component: AlchemyStep },
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
      <Container disableGutters maxWidth="sm" sx={{ mt: 8, mb: 10, px: 3 }}>
        <Stack alignItems="center">
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
