import { AppBar, Typography } from "@mui/material";

import { DraggableToolbar } from "@/components/DraggableToolbar";
import { type Tab } from "./Layout";

export function Navbar({ tab }: { tab: Tab }) {
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
          {tab.navbarComponent ? <tab.navbarComponent /> : tab.label}
        </Typography>
      </DraggableToolbar>
    </AppBar>
  );
}
