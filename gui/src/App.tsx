import {
  PaletteMode,
  ThemeProvider,
  createTheme,
  useMediaQuery,
} from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { grey } from "@mui/material/colors";
import React from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { Route, Router } from "wouter";

import { HomePage } from "./components/HomePage";
import { Navbar } from "./components/Navbar";
import { WagmiWrapper } from "./components/WagmiWrapper";
import { useHashLocation } from "./hooks/hashLocation";

const queryClient = new QueryClient({
  defaultOptions: { queries: { suspense: true } },
});

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

export default function App() {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const theme = React.useMemo(
    () => createTheme(getDesignTokens(prefersDarkMode ? "dark" : "light")),
    [prefersDarkMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline>
        <QueryClientProvider client={queryClient}>
          <WagmiWrapper>
            <Router hook={useHashLocation}>
              <Navbar />
              <Route path="/" component={HomePage} />
            </Router>
          </WagmiWrapper>
        </QueryClientProvider>
      </CssBaseline>
    </ThemeProvider>
  );
}
