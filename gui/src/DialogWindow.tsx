import { CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClient, QueryClientProvider } from "react-query";

import { type TxRequest, TxReviewDialog } from "./components/TxReviewDialog";
import { WagmiWrapper } from "./components/WagmiWrapper";
import { useTheme } from "./hooks/useTheme";

const queryClient = new QueryClient({
  defaultOptions: { queries: { suspense: true } },
});

export function Dialog() {
  const urlParams = new URLSearchParams(window.location.search);

  const type = urlParams.get("type") || "";
  const id = parseInt(urlParams.get("id") || "-1");
  const payload = JSON.parse(urlParams.get("payload") || "{}");

  const theme = useTheme();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline>
        <QueryClientProvider client={queryClient}>
          <WagmiWrapper>
            <Inner {...{ type, id, payload }} />
          </WagmiWrapper>
        </QueryClientProvider>
      </CssBaseline>
    </ThemeProvider>
  );
}

interface InnerProps {
  type: string;
  id: number;
  payload: unknown;
}

function Inner({ type, id, payload }: InnerProps) {
  switch (type) {
    case "tx-review":
      return <TxReviewDialog id={id} payload={payload as TxRequest} />;
    default:
      return <>Invalid dialog</>;
  }
}
