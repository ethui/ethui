import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

import { ErrorHandler } from "#/components/ErrorHandler";

const queryClient = new QueryClient();

const RouterDevtools =
  process.env.NODE_ENV === "production"
    ? () => null
    : lazy(() =>
      import("@tanstack/router-devtools").then((res) => ({
        default: res.TanStackRouterDevtools,
      })),
    );

export const Route = createRootRoute({
  component: () => <Root />,
});

function Root() {
  return (
    <ErrorHandler>
      <QueryClientProvider client={queryClient}>
        <Suspense>
          <Outlet />
        </Suspense>

        <Suspense>
          <div className="absolute bottom-0 left-0">
            <ReactQueryDevtools buttonPosition="relative" />
          </div>
          <RouterDevtools position="bottom-left" />
        </Suspense>
      </QueryClientProvider>
    </ErrorHandler>
  );
}
