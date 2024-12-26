import { EthuiLogo } from "@ethui/ui/components/ethui-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarRail,
  useSidebar,
} from "@ethui/ui/components/shadcn/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import { Link, useLocation } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronRight,
  CircleUser,
  Cog,
  FileCode2,
  ReceiptText,
  Terminal,
  Wifi,
} from "lucide-react";
import { cn } from "#/lib/utils";
import { useCommandBar } from "./CommandBar";
import { QuickAddressSelect } from "./QuickAddressSelect";
import { QuickFastModeToggle } from "./QuickFastModeToggle";
import { QuickNetworkSelect } from "./QuickNetworkSelect";
import { QuickWalletSelect } from "./QuickWalletSelect";

const isDev = import.meta.env.MODE === "development";

export function AppSidebar() {
  const commandBar = useCommandBar();
  const location = useLocation();
  const { open, toggleSidebar } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader
        className="flex items-center"
        data-tauri-drag-region="true"
      >
        <EthuiLogo
          onClick={toggleSidebar}
          size={48}
          bg="bg-transparent"
          fg={isDev ? "fill-dev" : "fill-sidebar-foreground"}
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link
                      href={item.url}
                      className={cn(
                        item.url === location.pathname &&
                          "bg-primary text-accent hover:bg-primary hover:text-accent",
                      )}
                    >
                      {item.icon}
                      {item.title}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              <Collapsible className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <Cog />
                      <span>Settings</span>
                      <ChevronRight className="ml-auto group-data-[state=open]/collapsible:hidden" />
                      <ChevronDown className="ml-auto group-data-[state=closed]/collapsible:hidden" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {settingsItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild>
                            <Link
                              href={item.url}
                              className={cn(
                                item.url === location.pathname &&
                                  "bg-primary text-accent hover:bg-primary hover:text-accent",
                              )}
                            >
                              {item.title}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {open && (
          <SidebarGroup>
            <div className="flex flex-col gap-y-3">
              <QuickWalletSelect />
              <QuickAddressSelect />
              <QuickNetworkSelect />
              <QuickFastModeToggle />
            </div>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => commandBar.setOpen(true)}>
              <Terminal />
              <span>Command Bar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

// Menu items.
const items = [
  {
    title: "Account",
    url: "/home/account",
    icon: <CircleUser />,
  },
  {
    title: "Transactions",
    url: "/home/transactions",
    icon: <ReceiptText />,
  },
  {
    title: "Contracts",
    url: "/home/contracts",
    icon: <FileCode2 />,
  },
  {
    title: "Connections",
    url: "/home/connections",
    icon: <Wifi />,
  },
];

const settingsItems = [
  { title: "General", url: "/home/settings/general" },
  { title: "Wallets", url: "/home/settings/wallets" },
  { title: "Network", url: "/home/settings/networks" },
  { title: "Foundry", url: "/home/settings/foundry" },
  { title: "Tokens", url: "/home/settings/tokens" },
];
