import { AnimatedOutlet } from "#/components/AnimatedOutlet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dialog/_l")({
  component: DialogLayout,
});

function DialogLayout() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden p-2">
      <AnimatedOutlet />
    </div>
  );
}
