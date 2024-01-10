import { Box, Stack } from "@mui/material";
import { ReactNode } from "react";
import { Outlet } from "react-router-dom";

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

DialogLayout.Bottom = function Bottom({ children }: { children: ReactNode }) {
  return (
    <Box pb={2} width="100%" position="fixed" sx={{ top: "auto", bottom: 0 }}>
      {children}
    </Box>
  );
};
