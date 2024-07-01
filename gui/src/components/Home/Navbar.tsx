import { AppBar, Typography } from "@mui/material";

import type { ReactNode } from "react";

import { DraggableToolbar } from "@/components/DraggableToolbar";

interface NavbarProps {
  children: ReactNode;
}

export function Navbar({ children }: NavbarProps) {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        borderBottomWidth: 1,
      }}
    >
      <DraggableToolbar>
        <Typography variant="h6" component="div">
          {children}
        </Typography>
      </DraggableToolbar>
    </AppBar>
  );
}
