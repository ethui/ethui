import { StylesObj, TourProvider } from "@reactour/tour";

import ContentComponent from "./Content";

const styles = {
  popover: (base: StylesObj) => ({
    ...base,
    color: "black",
    padding: 0,
  }),
  maskArea: (base: StylesObj) => ({ ...base, rx: 5 }),
  maskWrapper: (base: StylesObj) => ({ ...base, color: "#ffffff" }),
  controls: (base: StylesObj) => ({ ...base, marginTop: 50 }),
  close: (base: StylesObj) => ({ ...base, left: "auto", right: 8, top: 8 }),
};

const steps = [
  {
    selector: '[data-tour="step-1"]',
    content: "Here you can quickly switch wallets, address and networks.",
  },
  {
    selector: '[data-tour="step-2"]',
    content:
      "Skip confirmation dialog when using a plaintext wallet on the anvil network",
  },
  {
    selector: '[data-tour="step-3"]',
    content:
      "The main navigation tool within the app. Alternatively, use Ctrl+K/Cmd+K for prompting the command bar.",
  },
];

export default function TourWrapper({ children }: Props) {
  return (
    <TourProvider
      steps={steps}
      ContentComponent={ContentComponent}
      styles={styles}
      position="right"
      disableInteraction
      showBadge={false}
    >
      {children}
    </TourProvider>
  );
}

interface Props {
  children: React.ReactNode;
}
