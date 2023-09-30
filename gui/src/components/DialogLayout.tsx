import { Box, Stack } from "@mui/material";
import { ReactNode } from "react";

export function DialogLayout({ children }: { children: ReactNode }) {
  return (
    <Stack sx={{ widht: "100vw", height: "100vh", overflow: "hidden", p: 2 }}>
      {children}
    </Stack>
  );
}

DialogLayout.Bottom = ({ children }: { children: ReactNode }) => {
  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        width: "100%",
        pb: 2,
      }}
    >
      {children}
    </Box>
  );
};
