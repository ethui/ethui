import { lazy, Suspense } from "react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Box, GlobalStyles, ThemeProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { DevBuildNotice, ErrorHandler, WagmiWrapper } from "@/components";
import { useTheme } from "@/store/theme";

const queryClient = new QueryClient();

const RouterDevtools =
  process.env.NODE_ENV === "production"
    ? () => null
    : lazy(() =>
        import("@tanstack/router-devtools").then((res) => ({
          default: res.TanStackRouterDevtools,
        })),
      );

const globalStyles = {
  body: { userSelect: "none" },
  p: { userSelect: "initial" },
  h1: { userSelect: "initial" },
  h2: { userSelect: "initial" },
  h3: { userSelect: "initial" },
};

export const Route = createRootRoute({
  component: () => <Root />,
});

function Root() {
  const theme = useTheme((s) => s.theme);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles styles={globalStyles} />
      <CssBaseline>
        <ErrorHandler>
          <QueryClientProvider client={queryClient}>
            <DevBuildNotice />
            <WagmiWrapper>
              <Suspense>
                <Outlet />
              </Suspense>

              <Suspense>
                <Box sx={{ position: "absolute", bottom: 50, left: 0 }}>
                  <ReactQueryDevtools buttonPosition="relative" />
                </Box>
                <RouterDevtools position="bottom-left" />
              </Suspense>
            </WagmiWrapper>
          </QueryClientProvider>
        </ErrorHandler>
      </CssBaseline>
    </ThemeProvider>
  );
}
