import { useState } from "react";

import { OnboardingWizard } from "./OnboardingWizard";

interface Props {
  children: React.ReactNode;
}

const onboarded = localStorage.getItem("onboarded");

export function OnboardingWrapper({ children }: Props) {
  const [isOnboarded, setIsOnboarded] = useState(!!onboarded);

  const closeOnboarding = () => {
    localStorage.setItem("onboarded", "true");
    setIsOnboarded(true);
  };

  if (isOnboarded) return <>{children}</>;

  return <OnboardingWizard closeOnboarding={closeOnboarding} />;
}
