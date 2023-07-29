import { AppBar, Toolbar } from "@mui/material";

import { useTheme } from "../store";

export function Navbar() {
  const palette = useTheme((s) => s.theme.palette);

  return (
    <AppBar
      position="sticky"
      sx={{
        background: palette.background.default,
        color: palette.text.primary,
        boxShadow: "none",
        height: 32,
      }}
      data-tauri-drag-region="true"
    ></AppBar>
  );
}
