import { AppBar, Toolbar, Typography } from "@mui/material";

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
      <Toolbar data-tauri-drag-region="true">
        <Typography variant="h6" component="div">
          {tab.name}
        </Typography>
      </Toolbar>
    </AppBar>
  );
}
