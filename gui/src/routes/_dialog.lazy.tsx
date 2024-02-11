import { Stack } from "@mui/material";
import { createLazyFileRoute } from "@tanstack/react-router";
import { Outlet } from "react-router-dom";

export const Route = createLazyFileRoute("/_dialog")({
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
