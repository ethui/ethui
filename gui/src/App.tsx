import { ThemeProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { QueryClient, QueryClientProvider } from "react-query";
import { Route, Router, Switch } from "wouter";

import { CommandBar } from "./components/CommandBar";
import { HomePage } from "./components/HomePage";
import { Navbar } from "./components/Navbar";
import { TxReviewDialog } from "./components/TxReviewDialog";
import { WagmiWrapper } from "./components/WagmiWrapper";
import { WalletUnlockDialog } from "./components/WalletUnlockDialog";
import { useTheme } from "./store/theme";

const queryClient = new QueryClient({
  defaultOptions: { queries: { suspense: true } },
});

export default function App() {
  const theme = useTheme((s) => s.theme);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline>
        <QueryClientProvider client={queryClient}>
          <WagmiWrapper>
            <Routes />
          </WagmiWrapper>
        </QueryClientProvider>
      </CssBaseline>
    </ThemeProvider>
  );
}

function Routes() {
  return (
    <Router>
      <Switch>
        <Route path="/dialog/tx-review/:id">
          {({ id }: { id: string }) => <TxReviewDialog id={parseInt(id)} />}
        </Route>

        <Route path="/dialog/wallet-unlock/:id">
          {({ id }: { id: string }) => <WalletUnlockDialog id={parseInt(id)} />}
        </Route>

        <Route>
          <Navbar />
          <HomePage />
          <CommandBar />
        </Route>
      </Switch>
    </Router>
  );
}
