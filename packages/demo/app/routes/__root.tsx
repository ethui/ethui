import { Breadcrumbs } from "#/components/breadcrumbs";
import { Separator } from "@ethui/ui/components/shadcn/separator";
import appCss from "@ethui/ui/tailwind.css?url";
import rainbowKitCss from "@rainbow-me/rainbowkit/styles.css?url";
console.log(rainbowKitCss);
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
import { Meta, Scripts } from "@tanstack/start";
import type { ReactNode } from "react";
import { Ethereum } from "#/components/ethereum";
import { ConnectButton } from "@rainbow-me/rainbowkit";

type Context = {
  breadcrumb?: string;
};

export const Route = createRootRouteWithContext<Context>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "TanStack Start Starter",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: rainbowKitCss },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

const queryClient = new QueryClient();

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <Meta />
      </head>
      <body>
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
                <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
              </SidebarInset>
            </SidebarProvider>
            <ScrollRestoration />
            <Scripts />
          </Ethereum>
        </QueryClientProvider>
      </body>
    </html>
  );
}
