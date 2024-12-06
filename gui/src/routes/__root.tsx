import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";
import { Suspense } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

import { AnimatedOutlet } from "#/components/AnimatedOutlet";
import { ErrorHandler } from "#/components/ErrorHandler";
import { ClipboardProvider } from "@ethui/ui/components/providers/clipboard-provider";

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
        <ClipboardProvider clipboard={{ writeText }}>
          <Suspense>
            <AnimatedOutlet />
          </Suspense>
        </ClipboardProvider>
      </QueryClientProvider>
    </ErrorHandler>
  );
}
