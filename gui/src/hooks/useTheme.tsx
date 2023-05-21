import { PaletteMode, createTheme, useMediaQuery } from "@mui/material";
import { grey } from "@mui/material/colors";
import { useMemo } from "react";

import { GeneralSettings } from "../types";
import { useInvoke } from "./tauri";

const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,
    ...(mode === "light"
      ? {
          background: {
            default: grey[50],
          },
        }
      : {
          background: {},
        }),
  },
});

export function useTheme() {
  const { data } = useInvoke<GeneralSettings>("settings_get");

  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const final =
    data?.darkMode == "dark" || (data?.darkMode == "auto" && prefersDarkMode);

  const theme = useMemo(
    () => createTheme(getDesignTokens(final ? "dark" : "light")),
    [final]
  );

  return theme;
}
