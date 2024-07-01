import { Box } from "@mui/material";

import type { ReactNode } from "react";

export function DialogBottom({ children }: { children: ReactNode }) {
  return (
    <Box pb={2} width="100%" position="fixed" sx={{ top: "auto", bottom: 0 }}>
      {children}
    </Box>
  );
}
