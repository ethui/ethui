import { Box, Stack } from "@mui/material";
import { ReactNode } from "react";

export function DialogLayout({ children }: { children: ReactNode }) {
  return (
    <Stack sx={{ widht: "100vw", height: "100vh", overflow: "hidden", p: 2 }}>
      {children}
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
