import { createFileRoute } from "@tanstack/react-router";
import { AnimatedOutlet } from "#/components/AnimatedOutlet";

export const Route = createFileRoute("/home/_l/networks/_l/stacks/_l")({
  beforeLoad: () => ({ breadcrumb: { label: "Stacks", path: null } }),
  component: Stacks,
});

function Stacks() {
  return (
    <div className="m-4">
      <AnimatedOutlet />
    </div>
  );
}
