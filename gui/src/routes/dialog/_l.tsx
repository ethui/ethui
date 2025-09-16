import { EthuiLogo } from "@ethui/ui/components/ethui-logo";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatedOutlet } from "#/components/AnimatedOutlet";
import { useTheme } from "#/store/useTheme";

export const Route = createFileRoute("/dialog/_l")({
  component: DialogLayout,
});

const isDev = import.meta.env.MODE === "development";
const isTest = import.meta.env.MODE === "test";

function DialogLayout() {
  // necessary to correctly apply dark mode
  useTheme();

  let logoFill = "fill-sidebar-foreground";
  if (isDev) {
    logoFill = "fill-dev";
  }
  if (isTest) {
    logoFill = "fill-[#dd8622]";
  }

  return (
    // TODO: merge this header with the one from each dialog's layout, to save vertical space
    // ideally the logo should just be in the left corner, before whatever each other dialog shows
    <div className="flex h-screen w-screen flex-col">
      <header className="flex h-auto justify-center" data-tauri-drag-region>
        <EthuiLogo size={40} bg="bg-transparent" fg={logoFill} />
        &nbsp;
      </header>
      <main className="flex-grow overflow-hidden p-2">
        <AnimatedOutlet />
      </main>
    </div>
  );
}
