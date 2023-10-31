import "./global.css";
import "react18-json-view/src/style.css";

import { GlobalStyles, ThemeProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { StylesObj, TourProvider } from "@reactour/tour";
import { SnackbarProvider } from "notistack";
import { QueryClient, QueryClientProvider } from "react-query";
import { Route, Router, Switch } from "wouter";

import {
  CommandBar,
  DevBuildNotice,
  ErrorHandler,
  HomePage,
  WagmiWrapper,
} from "@/components";
import {
  MsgSignDialog,
  TxReviewDialog,
  WalletUnlockDialog,
} from "@/components/Dialogs";
import { Onboarding } from "@/components/Onboarding";

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

const styles = {
  popover: (base: StylesObj) => ({
    ...base,
    color: "black",
  }),
};

const steps = [
  {
    selector: '[data-tour="step-1"]',
    content: "This is the first Step",
  },
  {
    selector: '[data-tour="step-2"]',
    content: "This is the first Step",
  },
  {
    selector: '[data-tour="step-3"]',
    content: "This is the first Step",
  },
  {
    selector: '[data-tour="step-4"]',
    content: "This is the first Step",
  },
];

export default function App() {
  const theme = useTheme((s) => s.theme);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles styles={globalStyles} />
      <CssBaseline>
        <TourProvider
          steps={steps}
          styles={styles}
          showCloseButton={false}
          disableInteraction
        >
          <ErrorHandler>
            <QueryClientProvider client={queryClient}>
              <DevBuildNotice />
              <WagmiWrapper>
                <Routes />
              </WagmiWrapper>
            </QueryClientProvider>
          </ErrorHandler>
        </TourProvider>
      </CssBaseline>
    </ThemeProvider>
  );
}

function Routes() {
  return (
    <Router>
      <Switch>
        <Route path="/onboarding">
          <Onboarding />
        </Route>

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
          <SnackbarProvider
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            preventDuplicate
            dense
          >
            <CommandBar>
              <HomePage />
            </CommandBar>
          </SnackbarProvider>
        </Route>
      </Switch>
    </Router>
  );
}
