import React from "react";
import { type Preview } from "@storybook/react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { lightTheme, darkTheme } from "../src/themes";
import { withThemeFromJSXProvider } from "@storybook/addon-themes";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "@fontsource/material-icons";

export const parameters: Preview["parameters"] = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    expanded: true,
    hideNoControlsWarning: true,
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/i,
    },
  },
  // decorators: [
  //   withThemeFromJSXProvider({
  //     themes: { light: lightTheme, dark: darkTheme },
  //     defaultTheme: "dark",
  //     Provider: ThemeProvider,
  //     GlobalStyles: CssBaseline,
  //   }),
  // ],
};

// export default preview;
