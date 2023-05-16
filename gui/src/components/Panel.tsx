import { Box } from "@mui/material";
import React, { ReactNode } from "react";

export default function Panel({ children }: { children: ReactNode }) {
  return <Box sx={{ p: 4 }}>{children}</Box>;
}
