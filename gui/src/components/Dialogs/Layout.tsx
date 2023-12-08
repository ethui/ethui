import { Stack } from "@mui/material";
import { ReactNode } from "react";

export function DialogLayout({ children }: { children: ReactNode }) {
  return (
    <Stack sx={{ widht: "100vw", height: "100vh", overflow: "hidden", p: 2 }}>
      {children}
    </Stack>
  );
}
