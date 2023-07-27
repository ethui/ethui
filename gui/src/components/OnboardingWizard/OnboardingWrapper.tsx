import { useState } from "react";

import { OnboardingWizard } from "./OnboardingWizard";

interface Props {
  children: React.ReactNode;
}

export function OnboardingWrapper({ children }: Props) {
  // TODO: get state from local storage
  const onboarded = false;

  const [isOnboarded, setIsOnboarded] = useState(onboarded);

  const closeOnboarding = () => {
    // TODO: update local storage
    setIsOnboarded(true);
  };

  if (isOnboarded) return <>{children}</>;

  return <OnboardingWizard handleClose={closeOnboarding} />;
}
