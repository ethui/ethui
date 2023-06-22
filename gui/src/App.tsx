import CssBaseline from "@mui/material/CssBaseline";
import { QueryClient, QueryClientProvider } from "react-query";
import { Route, Router, Switch } from "wouter";

import { CommandBar, CommandBarProvider } from "./components/CommandBar";
import { HomePage } from "./components/HomePage";
import { Navbar } from "./components/Navbar";
import { ProviderNativeBalance } from "./components/ProviderNativeBalance";
import { ProviderTheme } from "./components/ProviderTheme";
import { ProviderTokensBalances } from "./components/ProviderTokensBalances";
import { TxReviewDialog } from "./components/TxReviewDialog";
import { WagmiWrapper } from "./components/WagmiWrapper";
import { WalletUnlockDialog } from "./components/WalletUnlockDialog";

const queryClient = new QueryClient({
  defaultOptions: { queries: { suspense: true } },
});

export default function App() {
  return (
    <CommandBarProvider>
      <ProviderTheme>
        <CssBaseline>
          <QueryClientProvider client={queryClient}>
            <WagmiWrapper>
              <ProviderNativeBalance>
                <ProviderTokensBalances>
                  <Routes />
                </ProviderTokensBalances>
              </ProviderNativeBalance>
            </WagmiWrapper>
          </QueryClientProvider>
        </CssBaseline>
      </ProviderTheme>
    </CommandBarProvider>
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
          <CommandBar>
            <Navbar />
            <HomePage />
          </CommandBar>
        </Route>
      </Switch>
    </Router>
  );
}
