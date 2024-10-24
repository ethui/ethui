import { CssBaseline, ThemeProvider } from "@mui/material";
import { withThemeFromJSXProvider } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react";
import { darkTheme, lightTheme } from "../themes";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "@fontsource/material-icons";
import "@fontsource/roboto-mono/400.css";

const preview: Preview = {
  controls: {
    expanded: true,
    hideNoControlsWarning: true,
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/i,
    },
  },
  decorators: [
    withThemeFromJSXProvider({
      themes: { light: lightTheme, dark: darkTheme },
      defaultTheme: "dark",
      Provider: ThemeProvider,
      GlobalStyles: CssBaseline,
    }) as any,
  ],
};

export default preview;
