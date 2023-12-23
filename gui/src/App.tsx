import "./global.css";
import "react18-json-view/src/style.css";

import { GlobalStyles, ThemeProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { SnackbarProvider } from "notistack";
import { QueryClient, QueryClientProvider } from "react-query";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";

import {
  Account,
  Connections,
  Contracts,
  DevBuildNotice,
  ErrorHandler,
  Txs,
  WagmiWrapper,
} from "@/components";
import {
  MsgSignDialog,
  ChainAddDialog,
  TxReviewDialog,
  WalletUnlockDialog,
} from "@/components/Dialogs";
import { Onboarding } from "@/components/Onboarding";
import { useTheme } from "./store/theme";
import { HomePageLayout } from "./components/Home";

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

const router = createBrowserRouter([
  {
    path: "/",
    element: <Base />,
    children: [
      {
        path: "home/",
        element: <HomePageLayout />,
        children: [
          { path: "account", element: <Account /> },
          { path: "transactions", element: <Txs /> },
          { path: "contracts", element: <Contracts /> },
          { path: "connections", element: <Connections /> },
        ],
      },
      { path: "onboarding/", element: <Onboarding /> },
      {
        path: "dialog/",
        children: [
          { path: "tx-review/:id", element: <TxReviewDialog id={1} /> },
          { path: "msg-sign/:id", element: <MsgSignDialog id={1} /> },
          { path: "wallet-unlock/:id", element: <WalletUnlockDialog id={1} /> },
          { path: "chain-add/:id", element: <ChainAddDialog id={1} /> },
        ],
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}

function Base() {
  const theme = useTheme((s) => s.theme);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles styles={globalStyles} />
      <CssBaseline>
        <ErrorHandler>
          <QueryClientProvider client={queryClient}>
            <DevBuildNotice />
            <WagmiWrapper>
              <Outlet />
            </WagmiWrapper>
          </QueryClientProvider>
        </ErrorHandler>
      </CssBaseline>
    </ThemeProvider>
  );
}
