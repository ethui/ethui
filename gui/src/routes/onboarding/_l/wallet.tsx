import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { SettingsWallets } from "#/components/Settings/Wallets";
import { Button } from "@ethui/ui/components/shadcn/button";

export const Route = createFileRoute("/onboarding/_l/wallet")({
  component: OnboardingWallet,
});

function OnboardingWallet() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-end gap-4">
      <h1 className="self-start text-xl">Wallet setup</h1>

      <p>
        A default (insecure) developer wallet is already set up for you. You can
        opt out by deleting it, and create additional secure wallets for daily
        use.
      </p>
      <div className="w-full max-w-full">
        <SettingsWallets />
      </div>

      <div className="flex w-full justify-center gap-2">
        <Button variant="ghost" onClick={() => router.history.back()}>
          Back
        </Button>
        <Button asChild>
          <Link to="/onboarding/extension">Next</Link>
        </Button>
      </div>
    </div>
  );
}
