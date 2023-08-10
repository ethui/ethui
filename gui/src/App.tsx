import { ThemeProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { QueryClient, QueryClientProvider } from "react-query";
import { Route, Router, Switch } from "wouter";

import {
  CommandBar,
  HomePage,
  MsgSignDialog,
  TxReviewDialog,
  WagmiWrapper,
  WalletUnlockDialog,
} from "./components";
import { OnboardingWrapper } from "./components/Onboarding";
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
          <OnboardingWrapper>
            <WagmiWrapper>
              <Routes />
            </WagmiWrapper>
          </OnboardingWrapper>
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

        <Route path="/dialog/msg-sign/:id">
          {({ id }: { id: string }) => <MsgSignDialog id={parseInt(id)} />}
        </Route>

        <Route path="/dialog/wallet-unlock/:id">
          {({ id }: { id: string }) => <WalletUnlockDialog id={parseInt(id)} />}
        </Route>
        <Route>
          <CommandBar>
            <HomePage />
          </CommandBar>
        </Route>
      </Switch>
    </Router>
  );
}
