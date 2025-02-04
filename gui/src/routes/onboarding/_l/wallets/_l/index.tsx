import { Button } from "@ethui/ui/components/shadcn/button";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { SettingsWallets } from "#/components/Settings/Wallets";

export const Route = createFileRoute("/onboarding/_l/wallets/_l/")({
  component: OnboardingWalletsList,
});

function OnboardingWalletsList() {
  const router = useRouter();

  return (
    <>
      <SettingsWallets
        backUrl="/onboarding/wallets"
        newWalletUrl="/onboarding/wallets/new"
        editWalletBaseUrl="/onboarding/wallets"
      />

      <div className="flex w-full justify-center gap-2">
        <Button variant="ghost" onClick={() => router.history.back()}>
          Back
        </Button>
        <Button asChild>
          <Link to="/onboarding/extension">Next</Link>
        </Button>
      </div>
    </>
  );
}
