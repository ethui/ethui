import { Container, MobileStepper, Stack } from "@mui/material";
import { useState } from "react";

import { DraggableToolbar } from "@/components";

import { AlchemyStep } from "./Alchemy";
import { InstallExtensionStep } from "./Extension";
import { HDWalletStep } from "./HDWallet";
import { ThankYouStep } from "./ThankYou";
import { WelcomeStep } from "./Welcome";

export interface StepProps {
  onSubmit: () => unknown;
}

export const steps: { component: React.FC<StepProps> }[] = [
  { component: WelcomeStep },
  { component: AlchemyStep },
  { component: HDWalletStep },
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
