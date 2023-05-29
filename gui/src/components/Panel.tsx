import { Box } from "@mui/material";
import { ReactNode } from "react";

export default function Panel({ children }: { children: ReactNode }) {
  return <Box sx={{ pb: 4, pt: 2, px: 4, minHeight: 300 }}>{children}</Box>;
}
