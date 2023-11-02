import { StepType, StylesObj, TourProvider } from "@reactour/tour";

import { useTheme } from "@/store/theme";

import PopoverContent from "./PopoverContent";

export default function TourWrapper({ children, steps, onClose }: Props) {
  const { theme } = useTheme();

  const maskWrapperColor =
    theme.palette.mode === "dark" ? "#ffffff" : "#000000";

  const styles = {
    popover: (base: StylesObj) => ({
      ...base,
      padding: 0,
      backgroundColor: theme.palette.background.default,
    }),
    maskWrapper: (base: StylesObj) => ({ ...base, color: maskWrapperColor }),
  };

  return (
    <TourProvider
      steps={steps}
      ContentComponent={PopoverContent}
      styles={styles}
      position="right"
      disableInteraction
      onClickClose={onClose}
      onClickMask={({ setCurrentStep, currentStep, steps, setIsOpen }) => {
        if (steps) {
          if (currentStep === steps.length - 1) {
            setIsOpen(false);
            onClose();
          } else {
            setCurrentStep((s) => s + 1);
          }
        }
      }}
      keyboardHandler={(e, clickProps) => {
        if (!clickProps || !clickProps.steps) return;

        const { setCurrentStep, steps, currentStep, setIsOpen } = clickProps;
        const lastStep = steps.length - 1;

        if (e.key === "ArrowRight") {
          setCurrentStep(Math.min(currentStep + 1, lastStep));
        }
        if (e.key === "ArrowLeft") {
          setCurrentStep(Math.max(currentStep - 1, 0));
        }
        if (e.key === "Escape" && currentStep === lastStep) {
          setIsOpen(false);
          onClose();
        }
      }}
    >
      {children}
    </TourProvider>
  );
}

interface Props {
  children: React.ReactNode;
  steps: StepType[];
  onClose: () => void;
}
