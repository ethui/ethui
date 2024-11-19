import { createFileRoute, Link } from "@tanstack/react-router";

import type { StepProps } from "#/components/Onboarding";
import { AlchemyStep } from "#/components/Onboarding/Alchemy";
import { InstallExtensionStep } from "#/components/Onboarding/Extension";
import { ThankYouStep } from "#/components/Onboarding/ThankYou";
import { WalletSetupStep } from "#/components/Onboarding/WalletSetup";
import { WelcomeStep } from "#/components/Onboarding/Welcome";
import { Button } from "@ethui/ui/components/shadcn/button";

export const Route = createFileRoute("/onboarding/_l/")({
  component: Onboarding,
});

const steps: { component: React.FC<StepProps> }[] = [
  { component: WelcomeStep },
  { component: AlchemyStep },
  { component: WalletSetupStep },
  { component: InstallExtensionStep },
  { component: ThankYouStep },
];

function Onboarding() {
  return (
    <div className="m-3 flex w-full flex-col">
      <h1 className="self-start text-xl">Welcome</h1>

      <p>
        ethui is a toolkit for fullstack Ethereum development. Check out{" "}
        <Link
          href="https://ethui.dev"
          target="_blank"
          rel="nofollow noopener noreferrer"
        >
          our website
        </Link>{" "}
        to learn more, or check out the&nbsp;
        <Link
          href="https://github.com/ethui/ethui"
          target="_blank"
          rel="nofollow noopener noreferrer"
        >
          source code on Github
        </Link>
        .
        <br />
        Contributors are welcome!
      </p>
      <div className="self-center">
        <Button type="submit" asChild>
          <Link to="/onboarding/alchemy">Next</Link>
        </Button>
      </div>
    </div>
  );
}
