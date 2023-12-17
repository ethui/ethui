import { ThemeProvider, CssBaseline } from "@mui/material";
import React, { useMemo } from "react";
import * as themes from "../src/themes";

export const withMuiTheme = (Story: any, context: any) => {
  const { theme: themeKey } = context.globals;

  console.log(themes, context.globals);
  // only recompute the theme if the themeKey changes
  const theme = useMemo(() => themes[themeKey] || themes["light"], [themeKey]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Story />
    </ThemeProvider>
  );
};
