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
