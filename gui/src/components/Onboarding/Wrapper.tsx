import { useState } from "react";

import { post } from "@/api";
import { useApi } from "@/hooks";
import { GeneralSettings } from "@/types";

import { OnboardingWizard } from "./Wizard";

interface Props {
  children: React.ReactNode;
}

export function OnboardingWrapper({ children }: Props) {
  const [isOnboarded, setIsOnboarded] = useState<boolean>();
  const { data: settings } = useApi<GeneralSettings>("/settings");

  const closeOnboarding = () => {
    setIsOnboarded(true);
    post("/settings/finish_onboarding");
  };

  if (!settings) return null;

  if (isOnboarded || settings.onboarded) return <>{children}</>;

  return <OnboardingWizard closeOnboarding={closeOnboarding} />;
}
