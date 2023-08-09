import { AppBar, Toolbar, Typography } from "@mui/material";

import { useTheme } from "../store";
import { TABS } from "./Sidebar";

export function Navbar({ tab }: { tab: (typeof TABS)[number] }) {
  const palette = useTheme((s) => s.theme.palette);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: palette.background.default,
        color: palette.text.primary,
        borderBottom: 1,
        borderColor: palette.divider,
      }}
    >
      <Toolbar data-tauri-drag-region="true" variant="dense">
        <Typography variant="h6" component="div">
          {tab.name}
        </Typography>
      </Toolbar>
    </AppBar>
  );
}
