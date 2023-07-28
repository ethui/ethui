import { useState } from "react";

import { OnboardingWizard } from "./OnboardingWizard";

interface Props {
  children: React.ReactNode;
}

export function OnboardingWrapper({ children }: Props) {
  const onboarded = localStorage.getItem("onboarded");

  const [isOnboarded, setIsOnboarded] = useState(!!onboarded);

  const closeOnboarding = () => {
    localStorage.setItem("onboarded", "true");
    setIsOnboarded(true);
  };

  if (isOnboarded) return <>{children}</>;

  return <OnboardingWizard closeOnboarding={closeOnboarding} />;
}
