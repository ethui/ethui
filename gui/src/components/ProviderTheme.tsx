import {
  PaletteMode,
  Theme,
  ThemeProvider,
  createTheme,
  useMediaQuery,
} from "@mui/material";
import { grey } from "@mui/material/colors";
import { invoke } from "@tauri-apps/api/tauri";
import { useRegisterActions } from "kbar";
import { ReactNode, createContext, useMemo } from "react";

import { useInvoke } from "../hooks/tauri";
import { GeneralSettings } from "../types";

const themeModeId = "themeMode";

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

export const ThemeContext = createContext<Theme | null>(null);

export function ProviderTheme({ children }: { children: ReactNode }) {
  const { data, mutate } = useInvoke<GeneralSettings>("settings_get");

  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const changeMode = async (darkMode: string) => {
    await invoke("settings_set", {
      newSettings: { ...data, darkMode },
    });

    mutate();
  };

  useRegisterActions([
    {
      id: themeModeId,
      name: "Change theme mode",
      section: "",
    },
    ...["auto", "dark", "light"].map((mode) => ({
      id: `${themeModeId}/${mode}`,
      name: mode,
      parent: themeModeId,
      perform: () => changeMode(mode),
    })),
  ]);

  const final =
    data?.darkMode == "dark" || (data?.darkMode == "auto" && prefersDarkMode);

  const theme = useMemo(
    () => createTheme(getDesignTokens(final ? "dark" : "light")),
    [final]
  );

  return (
    <ThemeContext.Provider value={theme}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  );
}
