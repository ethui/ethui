import type { PaletteMode } from "@mui/material";
import { type Theme, createTheme } from "@mui/material/styles";

import { grey, lightBlue, red, yellow } from "@mui/material/colors";

export const lightTheme = getTheme("light");
export const darkTheme = getTheme("dark");

function getTheme(mode: PaletteMode): Theme {
  const theme = createTheme({ palette: { mode } });
  const light = mode === "light";
  const borderColor = light ? grey[300] : grey[800];
  const { augmentColor } = theme.palette;

  return createTheme(theme, {
    palette: {
      mode,
      highlight1: augmentColor({
        color: { main: light ? grey[200] : grey[800] },
      }),
      highlight2: augmentColor({
        color: { main: light ? red[800] : red[500] },
      }),
      highlight3: augmentColor({
        color: { main: light ? yellow[900] : yellow[500] },
      }),
      highlight4: augmentColor({
        color: { main: light ? lightBlue[800] : lightBlue[500] },
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
  });
}
