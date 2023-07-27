import { useState } from "react";

import { OnboardingCarousel } from "./OnboardingCarousel";
import { steps } from "./Steps";

interface Props {
  handleClose: () => void;
}

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
