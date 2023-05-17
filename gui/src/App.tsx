import {
  PaletteMode,
  ThemeProvider,
  createTheme,
  useMediaQuery,
} from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { grey } from "@mui/material/colors";
import { useMemo } from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { Route, Router, Switch, useLocation } from "wouter";

import { HomePage } from "./components/HomePage";
import { Navbar } from "./components/Navbar";
import { TxReviewDialog } from "./components/TxReviewDialog";
import { WagmiWrapper } from "./components/WagmiWrapper";

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

  const theme = useMemo(
    () => createTheme(getDesignTokens(prefersDarkMode ? "dark" : "light")),
    [prefersDarkMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline>
        <QueryClientProvider client={queryClient}>
          <WagmiWrapper>
            <Router>
              <Switch>
                <Route path="/dialog/tx-review/:id">
                  {({ id }: { id: string }) => (
                    <TxReviewDialog id={parseInt(id)} />
                  )}
                </Route>

                <Route>
                  <Navbar />
                  <HomePage />
                </Route>
              </Switch>
            </Router>
          </WagmiWrapper>
        </QueryClientProvider>
      </CssBaseline>
    </ThemeProvider>
  );
}
