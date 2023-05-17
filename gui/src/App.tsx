import { ThemeProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import React from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { Route, Router, Switch, useLocation } from "wouter";

import { HomePage } from "./components/HomePage";
import { Navbar } from "./components/Navbar";
import { TxReviewDialog } from "./components/TxReviewDialog";
import { WagmiWrapper } from "./components/WagmiWrapper";
import { useTheme } from "./hooks/useTheme";

const queryClient = new QueryClient({
  defaultOptions: { queries: { suspense: true } },
});

export default function App() {
  const theme = useTheme();
  const loc = useLocation();
  console.log(loc);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline>
        <QueryClientProvider client={queryClient}>
          <WagmiWrapper>
            <Router>
              <Switch>
                <Route path="/dialog/tx-review/:id">
                  {({ id }) => <TxReviewDialog id={parseInt(id!)} />}
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
