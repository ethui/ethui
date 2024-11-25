import { createFileRoute } from "@tanstack/react-router";
import { AnimatedOutlet } from "#/components/AnimatedOutlet";

export const Route = createFileRoute("/home/_l/settings/_l")({
  beforeLoad: () => ({ breadcrumb: "Settings" }),
  component: Settings,
});

function Settings() {
  return (
    <div className="m-4">
      <AnimatedOutlet />
    </div>
  );
}
