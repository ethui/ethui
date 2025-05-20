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
  useSidebar,
} from "@ethui/ui/components/shadcn/sidebar";
import { cn } from "@ethui/ui/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import { Link, useLocation } from "@tanstack/react-router";
import { platform } from "@tauri-apps/plugin-os";
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
import { useSettings } from "#/store/useSettings";
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
  const isMacos = platform() === "macos";

  const showOnboarding = useSettings((s) => !s.settings?.onboarding.hidden);

  return (
    <Sidebar className="select-none" collapsible="icon">
      <SidebarHeader
        className={cn("flex items-center", { "pt-8": isMacos })}
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
              {showOnboarding && (
                <CustomSidebarMenuItem
                  url="/home/onboarding"
                  icon={<CircleUser />}
                  title="Onboarding"
                />
              )}
              {items.map((item) => (
                <CustomSidebarMenuItem
                  key={item.title}
                  {...item}
                  className={cn(
                    item.url === location.pathname &&
                      "bg-primary text-accent hover:bg-primary hover:text-accent",
                  )}
                />
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
                              to={item.url}
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

function CustomSidebarMenuItem({
  url,
  icon,
  title,
  className = "",
}: { url: string; icon: React.ReactNode; title: string; className?: string }) {
  return (
    <SidebarMenuItem key={title}>
      <SidebarMenuButton asChild>
        <Link to={url} className={className}>
          {icon}
          {title}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
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
