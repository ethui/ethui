import { Breadcrumbs } from "#/components/breadcrumbs";
import { Separator } from "@ethui/ui/components/shadcn/separator";
import { AppSidebar } from "#/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "#/components/shadcn/sidebar";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  ScrollRestoration,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { Ethereum } from "#/components/ethereum";
import { ConnectButton } from "@rainbow-me/rainbowkit";

type Context = {
  breadcrumb?: string;
};

export const Route = createRootRouteWithContext<Context>()({
  component: Root,
});

const queryClient = new QueryClient();

function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <Ethereum>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex sticky top-0 bg-background h-16 shrink-0 items-center justify-between  border-b px-4">
              <div className="flex gap-2 items-center">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumbs />
              </div>
              <ConnectButton />
            </header>
            <div className="flex flex-1 flex-col gap-4 p-4">
              <Outlet />
            </div>
          </SidebarInset>
        </SidebarProvider>
        <ScrollRestoration />
      </Ethereum>
    </QueryClientProvider>
  );
}
