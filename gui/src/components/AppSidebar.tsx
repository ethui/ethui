import { EthuiLogo } from "@ethui/ui/components/ethui-logo";
import {
  Sidebar,
  SidebarContent,
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
  Database,
  Globe,
  Wallet,
  Wifi,
} from "lucide-react";
import { useIsAnvilNetwork } from "#/hooks/useIsAnvilNetwork";
import { useSettings } from "#/store/useSettings";
import { QuickFastModeToggle } from "./QuickFastModeToggle";

const isDev = import.meta.env.MODE === "development";
const isTest = import.meta.env.MODE === "test";

export function AppSidebar() {
  const { open, toggleSidebar } = useSidebar();
  const isMacos = platform() === "macos";

  const { data: isAnvilNetwork = false } = useIsAnvilNetwork();

  const showOnboarding = useSettings((s) => !s.settings?.onboarding.hidden);

  const settingsItems = [...defaultSettingsItems];

  let logoFill = "fill-sidebar-foreground";
  if (isDev) {
    logoFill = "fill-dev";
  }
  if (isTest) {
    logoFill = "fill-[#dd8622]";
  }

  return (
    <Sidebar className="select-none pt-12" collapsible="icon">
      <SidebarHeader
        className={cn("flex items-center", { "pt-8": isMacos })}
        data-tauri-drag-region="true"
      >
        <EthuiLogo
          onClick={toggleSidebar}
          size={48}
          bg="bg-transparent"
          fg={logoFill}
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
                <CustomSidebarMenuItem key={item.title} {...item} />
              ))}
              <CollapsibleMenuSection
                icon={<Globe />}
                title="Explorer"
                items={getExplorerItems(isAnvilNetwork)}
                defaultOpen={true}
              />
              <CollapsibleMenuSection
                icon={<Cog />}
                title="Settings"
                items={settingsItems}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {open && (
          <SidebarGroup>
            <SidebarGroupContent>
              <QuickFastModeToggle />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

interface CustomSidebarMenuItemProps {
  url: string;
  icon: React.ReactNode;
  title: string;
  className?: string;
}

function CustomSidebarMenuItem({
  url,
  icon,
  title,
}: CustomSidebarMenuItemProps) {
  const location = useLocation();

  return (
    <SidebarMenuItem key={title}>
      <SidebarMenuButton
        asChild
        className={cn(
          (url === location.pathname || location.pathname.startsWith(url)) &&
          "bg-primary text-accent hover:bg-primary hover:text-accent",
        )}
      >
        <Link to={url}>
          {icon}
          {title}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

interface CollapsibleMenuSectionProps {
  icon: React.ReactNode;
  title: string;
  items: Array<{ title: string; url: string }>;
  defaultOpen?: boolean;
}

function CollapsibleMenuSection({
  icon,
  title,
  items,
  defaultOpen = false,
}: CollapsibleMenuSectionProps) {
  const location = useLocation();

  return (
    <Collapsible className="group/collapsible" defaultOpen={defaultOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild className="cursor-pointer">
          <SidebarMenuButton>
            {icon}
            <span>{title}</span>
            <ChevronRight className="ml-auto group-data-[state=open]/collapsible:hidden" />
            <ChevronDown className="ml-auto group-data-[state=closed]/collapsible:hidden" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    (item.url === location.pathname ||
                      location.pathname.startsWith(item.url)) &&
                    "bg-primary text-accent hover:bg-primary hover:text-accent",
                  )}
                >
                  <Link to={item.url}>{item.title}</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function getExplorerItems(isAnvilNetwork: boolean) {
  return explorerItems.filter((item) => !item.anvilOnly || isAnvilNetwork);
}
// Menu items.
const items = [
  {
    title: "Account",
    url: "/home/account",
    icon: <CircleUser />,
  },
  {
    title: "Wallets",
    url: "/home/wallets",
    icon: <Wallet />,
  },
  {
    title: "Connections",
    url: "/home/connections",
    icon: <Wifi />,
  },
  {
    title: "Networks",
    url: "/home/networks",
    icon: <Database />,
  },
];

const explorerItems = [
  { title: "Addresses", url: "/home/explorer/addresses", anvilOnly: true },
  { title: "Transactions", url: "/home/explorer/transactions" },
  { title: "Contracts", url: "/home/explorer/contracts" },
];

const defaultSettingsItems = [
  { title: "General", url: "/home/settings/general" },
  { title: "Foundry", url: "/home/settings/foundry" },
  { title: "Tokens", url: "/home/settings/tokens" },
  { title: "About", url: "/home/settings/about" },
  { title: "Logging", url: "/home/settings/logging" },
];
