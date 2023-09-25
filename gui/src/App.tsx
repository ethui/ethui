import { GlobalStyles, ThemeProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { SnackbarProvider } from "notistack";
import { QueryClient, QueryClientProvider } from "react-query";
import { Route, Router, Switch } from "wouter";

import {
  CommandBar,
  DevBuildNotice,
  HomePage,
  MsgSignDialog,
  TxReviewDialog,
  WagmiWrapper,
  WalletUnlockDialog,
} from "./components";
import { OnboardingWrapper } from "./components/Onboarding";
import "./global.css";
import { useTheme } from "./store/theme";

const queryClient = new QueryClient({
  defaultOptions: { queries: { suspense: true } },
});

const globalStyles = {
  body: { userSelect: "none" },
  p: { userSelect: "initial" },
  h1: { userSelect: "initial" },
  h2: { userSelect: "initial" },
  h3: { userSelect: "initial" },
};

export default function App() {
  const theme = useTheme((s) => s.theme);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles styles={globalStyles} />
      <CssBaseline>
        <QueryClientProvider client={queryClient}>
          <DevBuildNotice />
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
          <SnackbarProvider>
            <CommandBar>
              <HomePage />
            </CommandBar>
          </SnackbarProvider>
        </Route>
      </Switch>
    </Router>
  );
}
