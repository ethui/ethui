import { createFileRoute } from "@tanstack/react-router";
import { AnimatedOutlet } from "#/components/AnimatedOutlet";

export const Route = createFileRoute("/home/_l/wallets/_l")({
  beforeLoad: () => ({ breadcrumb: "Wallets" }),
  component: Wallets,
});

function Wallets() {
  return (
    <div className="m-4">
      <AnimatedOutlet />
    </div>
  );
}
