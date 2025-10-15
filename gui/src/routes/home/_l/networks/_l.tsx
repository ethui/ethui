import { createFileRoute } from "@tanstack/react-router";
import { AnimatedOutlet } from "#/components/AnimatedOutlet";

export const Route = createFileRoute("/home/_l/networks/_l")({
  beforeLoad: () => ({ breadcrumb: { label: "Networks", path: null } }),
  component: Networks,
});

function Networks() {
  return (
    <div className="m-4">
      <AnimatedOutlet />
    </div>
  );
}

