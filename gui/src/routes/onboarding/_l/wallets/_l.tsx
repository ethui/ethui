import { AnimatedOutlet } from "#/components/AnimatedOutlet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding/_l/wallets/_l")({
  component: () => (
    <div className="flex flex-col items-end gap-4">
      <h1 className="self-start text-xl">Wallet setup</h1>

      <p>
        A default (insecure) developer wallet is already set up for you. You can
        opt out by deleting it, and create additional secure wallets for daily
        use.
      </p>

      <AnimatedOutlet />
    </div>
  ),
});
