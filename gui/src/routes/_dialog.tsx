import { Stack } from "@mui/material";
import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dialog")({
  component: DialogLayout,
});

export function DialogLayout() {
  return (
    <Stack
      spacing={2}
      sx={{ widht: "100vw", height: "100vh", overflow: "hidden", p: 2 }}
    >
      <Outlet />
    </Stack>
  );
}
