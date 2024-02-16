import { AlchemyStep } from "./Alchemy";
import { InstallExtensionStep } from "./Extension";
import { ThankYouStep } from "./ThankYou";
import { WelcomeStep } from "./Welcome";

export interface StepProps {
  onSubmit: () => unknown;
}

export const steps: { component: React.FC<StepProps> }[] = [
  { component: WelcomeStep },
  { component: AlchemyStep },
  { component: InstallExtensionStep },
  { component: ThankYouStep },
];

export type WizardFormData = { alchemyApiKey?: string | null };
