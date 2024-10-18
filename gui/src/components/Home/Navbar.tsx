import { AppBar } from "@mui/material";
import type { ReactNode } from "react";

import { DraggableToolbar } from "#/components/DraggableToolbar";

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
        <h1 className="font text-xl">{children}</h1>
      </DraggableToolbar>
    </AppBar>
  );
}
