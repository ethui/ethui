import { createFileRoute } from "@tanstack/react-router";
import { AnimatedOutlet } from "#/components/AnimatedOutlet";
import { useTheme } from "#/store/useTheme";

export const Route = createFileRoute("/dialog/_l")({
  component: DialogLayout,
});

function DialogLayout() {
  // necessary to correctly apply dark mode
  useTheme();

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden p-2">
      <AnimatedOutlet />
    </main>
  );
}
