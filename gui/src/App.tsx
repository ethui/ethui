import { ThemeProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import React from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { Route, Router } from "wouter";

import { HomePage } from "./components/HomePage";
import { Navbar } from "./components/Navbar";
import { WagmiWrapper } from "./components/WagmiWrapper";
import { useHashLocation } from "./hooks/hashLocation";
import { useTheme } from "./hooks/useTheme";

const queryClient = new QueryClient({
  defaultOptions: { queries: { suspense: true } },
});

export default function App() {
  const theme = useTheme();

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
