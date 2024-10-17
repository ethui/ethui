import { } from "@mui/material";
import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dialog")({
  component: DialogLayout,
});

export function DialogLayout() {
  return (
    <div className="flex m-2 w-screen h-screen overflow-hidden p2">
      <Outlet />
    </div>
  );
}
