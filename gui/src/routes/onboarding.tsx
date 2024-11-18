import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Logo } from "#/components/Logo";
import type { StepProps } from "#/components/Onboarding";
import { AlchemyStep } from "#/components/Onboarding/Alchemy";
import { InstallExtensionStep } from "#/components/Onboarding/Extension";
import { ThankYouStep } from "#/components/Onboarding/ThankYou";
import { WalletSetupStep } from "#/components/Onboarding/WalletSetup";
import { WelcomeStep } from "#/components/Onboarding/Welcome";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

const steps: { component: React.FC<StepProps> }[] = [
  { component: WelcomeStep },
  { component: AlchemyStep },
  { component: WalletSetupStep },
  { component: InstallExtensionStep },
  { component: ThankYouStep },
];

function Onboarding() {
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const step = steps[activeStep];

  return (
    <>
      <header
        data-tauri-drag-region="true"
        className="sticky top-0 z-10 w-full"
      >
        &nbsp;
      </header>
      <div className="m-4 flex flex-col items-center">
        <Logo width={40} />
        <step.component onSubmit={handleNext} />
      </div>
    </>
  );
}
