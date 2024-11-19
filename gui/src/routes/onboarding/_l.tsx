import { Logo } from "#/components/Logo";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding/_l")({
  component: OnboardingLayout,
});

function OnboardingLayout() {
  return (
    <>
      <header
        data-tauri-drag-region="true"
        className="sticky top-0 z-10 w-full"
      >
        &nbsp;
      </header>
      <div className="m-4 flex flex-col items-center">
        <Logo width={40} />
        <Outlet />
      </div>
    </>
  );
}
