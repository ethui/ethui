import { PaletteMode, createTheme, useMediaQuery } from "@mui/material";
import { grey } from "@mui/material/colors";
import { useMemo } from "react";

export function useTheme() {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  console.log(prefersDarkMode);
  return useMemo(
    () => createTheme(getDesignTokens(prefersDarkMode ? "dark" : "light")),
    [prefersDarkMode]
  );
}

export const getDesignTokens = (mode: PaletteMode) => ({
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
