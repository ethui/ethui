import { createFileRoute } from "@tanstack/react-router";
import { AnimatedOutlet } from "#/components/AnimatedOutlet";

export const Route = createFileRoute("/home/_l/explorer/_l")({
  beforeLoad: () => ({
    breadcrumb: { label: "Explorer", path: null },
  }),
  component: Explorer,
});

function Explorer() {
  return (
    <div className="m-4">
      <AnimatedOutlet />
    </div>
  );
}
