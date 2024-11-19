import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { ErrorHandler } from "#/components/ErrorHandler";
import { AnimatedOutlet } from "#/components/AnimatedOutlet";

const queryClient = new QueryClient();

export const Route = createRootRoute({
  component: () => <Root />,
});

function Root() {
  return (
    <ErrorHandler>
      <QueryClientProvider client={queryClient}>
        <Suspense>
          <AnimatedOutlet />
        </Suspense>
      </QueryClientProvider>
    </ErrorHandler>
  );
}
