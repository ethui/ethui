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
  Globe,
  ReceiptText,
  Terminal,
  Wifi,
} from "lucide-react";
import { useInvoke } from "#/hooks/useInvoke";
import { useSettings } from "#/store/useSettings";
import { useCommandBar } from "./CommandBar";
import { QuickFastModeToggle } from "./QuickFastModeToggle";

const isDev = import.meta.env.MODE === "development";

export function AppSidebar() {
  const commandBar = useCommandBar();
  const { open, toggleSidebar } = useSidebar();
  const isMacos = platform() === "macos";

  const { data: isStacksEnabled } = useInvoke<boolean>("is_stacks_enabled", {});

  const showOnboarding = useSettings((s) => !s.settings?.onboarding.hidden);

  const settingsItems = [...defaultSettingsItems];
  if (
    isStacksEnabled &&
    !settingsItems.some((item) => item.title === "Stacks")
  ) {
    settingsItems.splice(settingsItems.length - 1, 0, {
      title: "Stacks",
      url: "/home/settings/stacks",
    });
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
                <CustomSidebarMenuItem key={item.title} {...item} />
              ))}

              <CollapsibleMenuSection
                icon={<Globe />}
                title="Explorer"
                items={explorerItems}
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
      <SidebarMenuButton asChild>
        <Link
          to={url}
          className={cn(
            url === location.pathname &&
              "bg-primary text-accent hover:bg-primary hover:text-accent",
          )}
        >
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
}

function CollapsibleMenuSection({
  icon,
  title,
  items,
}: CollapsibleMenuSectionProps) {
  const location = useLocation();

  return (
    <Collapsible className="group/collapsible">
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

const explorerItems = [
  { title: "Addresses", url: "/home/explorer/addresses" },
  { title: "Transactions", url: "/home/explorer/transactions" },
  { title: "Contracts", url: "/home/explorer/contracts" },
];

const defaultSettingsItems = [
  { title: "General", url: "/home/settings/general" },
  { title: "Wallets", url: "/home/settings/wallets" },
  { title: "Network", url: "/home/settings/networks" },
  { title: "Foundry", url: "/home/settings/foundry" },
  { title: "Tokens", url: "/home/settings/tokens" },
  { title: "About", url: "/home/settings/about" },
];
