import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";
import { Suspense } from "react";

import { AnimatedOutlet } from "#/components/AnimatedOutlet";
import { ErrorHandler } from "#/components/ErrorHandler";

const queryClient = new QueryClient();

type Context = {
  breadcrumb?: string;
};

export const Route = createRootRouteWithContext<Context>()({
  component: Root,
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
