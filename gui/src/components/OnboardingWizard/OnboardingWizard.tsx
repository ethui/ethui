import { useState } from "react";

import { useKeyPress } from "../../hooks";
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

  useKeyPress(["ArrowRight"], { meta: true }, handleNext);

  useKeyPress(["ArrowLeft"], { meta: true }, handleBack);

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
