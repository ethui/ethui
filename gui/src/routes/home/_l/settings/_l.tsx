import { createFileRoute } from "@tanstack/react-router";
import { AnimatedOutlet } from "#/components/AnimatedOutlet";

export const Route = createFileRoute("/home/_l/settings/_l")({
  beforeLoad: () => ({
    breadcrumb: { label: "Settings", path: null },
  }),
  component: Settings,
});

function Settings() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-4">
      <AnimatedOutlet />
    </div>
  );
}
