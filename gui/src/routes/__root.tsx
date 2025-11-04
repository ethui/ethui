import { ClipboardProvider } from "@ethui/ui/components/providers/clipboard-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { Suspense } from "react";
import { AnimatedOutlet } from "#/components/AnimatedOutlet";
import { ErrorHandler } from "#/components/ErrorHandler";

const queryClient = new QueryClient();

type Context = {
  breadcrumb?: string;
  breadcrumbActions?: React.ReactNode;
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
