import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dialog")({
  component: DialogLayout,
});

export function DialogLayout() {
  return (
    <div className="p-2 flex h-screen w-screen flex-col overflow-hidden">
      <Outlet />
    </div>
  );
}
