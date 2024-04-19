import { Stack } from "@mui/material";
import { createLazyFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/_dialog")({
  component: DialogLayout,
});

export function DialogLayout() {
  return (
    <Stack
      spacing={2}
      sx={{ width: "100vw", height: "100vh", overflow: "hidden", p: 2 }}
    >
      <Outlet />
    </Stack>
  );
}
