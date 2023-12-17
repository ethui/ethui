import {
  alpha,
  createTheme,
  PaletteMode,
  Theme,
  ThemeOptions,
} from "@mui/material";
import { grey, lightBlue } from "@mui/material/colors";
import { event, invoke } from "@tauri-apps/api";
import { Action } from "kbar";
import { create, StateCreator } from "zustand";

import { GeneralSettings } from "@/types/settings";

interface Store {
  mode: "auto" | "light" | "dark";
  theme: Theme;
  actions: Action[];

  reload: () => Promise<void>;
  changeMode: (mode: "auto" | "light" | "dark") => void;
}

const actionId = "themeMode";

const store: StateCreator<Store> = (set, get) => ({
  mode: "auto",
  theme: createTheme(getDesignTokens("light")),

  actions: [
    {
      id: actionId,
      name: "Change theme mode",
    },
    ...(["auto", "dark", "light"] as const).map((mode) => ({
      id: `${actionId}/${mode}`,
      name: mode,
      parent: actionId,
      perform: () => get().changeMode(mode),
    })),
  ],

  async reload() {
    const { darkMode } = await invoke<GeneralSettings>("settings_get");

    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    const mode =
      darkMode == "auto" ? (prefersDarkMode ? "dark" : "light") : darkMode;

    set({ mode, theme: createTheme(getDesignTokens(mode)) });
  },

  async changeMode(mode) {
    await invoke("settings_set_dark_mode", { mode });
    set({ mode });
    get().reload();
  },
});

event.listen("settings-changed", async () => {
  await useTheme.getState().reload();
});

export const useTheme = create<Store>()(store);

(async () => {
  await useTheme.getState().reload();
})();

function getDesignTokens(mode: PaletteMode): ThemeOptions {
  const theme = createTheme({});

  const light = mode === "light";

  const borderColor = light ? grey[300] : grey[800];
  const { augmentColor } = theme.palette;

  return {
    palette: {
      mode,
      highlight1: augmentColor({
        color: { main: alpha("#a1c9f4", 0.5) },
      }),
      highlight2: augmentColor({
        color: { main: alpha("#ffb482", 0.5) },
      }),
      highlight3: augmentColor({
        color: { main: alpha("#8de5a1", 0.5) },
      }),
      highlight4: augmentColor({
        color: { main: alpha("#ff9f9b88", 0.5) },
      }),
    },
    components: {
      MuiButton: {
        variants: [
          {
            props: { variant: "sidebar" as const },
            style: {
              textAlign: "left",
              height: theme.spacing(4),
              paddingLeft: theme.spacing(1),
              fontWeight: "inherit",
              justifyContent: "flex-start",
              textTransform: "inherit",
              "&.Mui-disabled": {
                backgroundColor: lightBlue[800],
                color: "white",
              },
              "& .MuiButton-startIcon": {
                marginLeft: 0,
              },
            },
          },
        ],
      },
      MuiTypography: {
        variants: [
          {
            props: { variant: "bordered" as const },
            style: {
              display: "block",
              borderColor: borderColor,
              borderBottomWidth: 1,
              borderBottomStyle: "solid",
              paddingBottom: "0.5em",
            },
          },
        ],
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            borderColor,
            borderBottomStyle: "solid",
            backgroundColor: theme.palette.background.default,
            color: "inherit",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderColor,
            borderWidth: 1,
          },
        },
      },
      MuiPaper: {
        variants: [
          {
            props: { variant: "lighter" as const },
            style: {
              background: light ? grey[100] : grey[900],
            },
          },
        ],
      },
      MuiToolbar: {
        defaultProps: {
          variant: "dense",
        },
      },

      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            "&:hover": {
              transition: "none",
              background: theme.palette.action.hover,
            },
            "&.Mui-expanded": {
              background: theme.palette.action.hover,
            },
          },
        },
      },
    },
  };
}
