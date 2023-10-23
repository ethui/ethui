import { invoke } from "@tauri-apps/api/tauri";
import { useState } from "react";

import { useInvoke } from "@/hooks";
import { GeneralSettings } from "@/types";

import { OnboardingWizard } from "./Wizard";

interface Props {
  children: React.ReactNode;
}

export function OnboardingWrapper({ children }: Props) {
  const [isOnboarded, setIsOnboarded] = useState<boolean>();
  const { data: settings } = useInvoke<GeneralSettings>("settings_get");

  const closeOnboarding = () => {
    setIsOnboarded(true);
    //invoke("settings_finish_onboarding");
  };

  if (!settings) return null;

  if (isOnboarded || settings.onboarded) return <>{children}</>;

  return <OnboardingWizard closeOnboarding={closeOnboarding} />;
}
