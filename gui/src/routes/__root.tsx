import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { ErrorHandler } from "#/components/ErrorHandler";

const queryClient = new QueryClient();

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
      </QueryClientProvider>
    </ErrorHandler>
  );
}
