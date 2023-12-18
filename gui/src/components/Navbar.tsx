import { AppBar, Typography } from "@mui/material";

import { DraggableToolbar } from "./DraggableToolbar";
import { TABS } from "./Sidebar";

export function Navbar({ tab }: { tab: (typeof TABS)[number] }) {
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
