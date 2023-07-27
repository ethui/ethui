import { useState } from "react";

import { OnboardingCarousel } from "./OnboardingCarousel";

export type Step = { label: string; description: string };

interface Props {
  handleClose: () => void;
}

const steps = [
  {
    label: "First",
    description: "Step 1",
  },
  {
    label: "Second",
    description: "Step 2",
  },
  {
    label: "Last",
    description: "Step 3",
  },
];

export function OnboardingWizard({ handleClose }: Props) {
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  return (
    <OnboardingCarousel
      steps={steps}
      activeStep={activeStep}
      handleClose={handleClose}
      handleNext={handleNext}
      handleBack={handleBack}
    />
  );
}
