import { EthuiLogo } from "@ethui/ui/components/ethui-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@ethui/ui/components/shadcn/sidebar";
import { cn } from "@ethui/ui/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import { platform } from "@tauri-apps/plugin-os";
import { CircleUser, Cog, Database, Globe, Wifi } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIsAnvilNetwork } from "#/hooks/useIsAnvilNetwork";
import { useSettings } from "#/store/useSettings";
import { QuickFastModeToggle } from "./QuickFastModeToggle";

const isDev = import.meta.env.MODE === "development";
const isTest = import.meta.env.MODE === "test";
const SIDEBAR_COLLAPSE_BREAKPOINT = 1100;

export function AppSidebar() {
  const { open, setOpen } = useSidebar();
  const isMacos = platform() === "macos";

  const { data: isAnvilNetwork = false } = useIsAnvilNetwork();

  const showOnboarding = useSettings((s) => !s.settings?.onboarding.hidden);

  const settingsItems = [...defaultSettingsItems];

  const [isCollapsedHover, setIsCollapsedHover] = useState(false);
  const openRef = useRef(open);

  useEffect(() => {
    if (open) {
      setIsCollapsedHover(false);
    }
  }, [open]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const syncSidebarWithViewport = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const shouldBeOpen = window.innerWidth >= SIDEBAR_COLLAPSE_BREAKPOINT;
    if (shouldBeOpen !== openRef.current) {
      openRef.current = shouldBeOpen;
      setOpen(shouldBeOpen);
    }
  }, [setOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    syncSidebarWithViewport();
    window.addEventListener("resize", syncSidebarWithViewport);
    return () => window.removeEventListener("resize", syncSidebarWithViewport);
  }, [syncSidebarWithViewport]);

  const showExpandedSidebar = open || isCollapsedHover;

  let logoFill = "fill-sidebar-foreground";
  if (isDev) {
    logoFill = "fill-dev";
  }
  if (isTest) {
    logoFill = "fill-[#dd8622]";
  }

  return (
    <Sidebar
      className={cn(
        "sidebar-transition-fast z-30 mt-12 select-none",
        "data-[hovered=true]:w-(--sidebar-width)",
        "data-[hovered=true]:shadow-lg",
        "data-[hovered=true]:[&_[data-sidebar=content]]:!overflow-auto",
        "group-data-[collapsible=icon]:[&_[data-sidebar=group-label]]:!mt-0",
        "data-[hovered=true]:[&_[data-sidebar=group-label]]:!mt-0",
        "data-[hovered=true]:[&_[data-sidebar=group-label]]:!opacity-100",
        "data-[hovered=true]:[&_[data-sidebar-label]]:opacity-100",
        "data-[hovered=true]:[&_[data-sidebar-label]]:pointer-events-auto",
      )}
      collapsible="icon"
      data-hovered={isCollapsedHover ? "true" : undefined}
      onPointerEnter={() => {
        if (!open) {
          setIsCollapsedHover(true);
        }
      }}
      onPointerLeave={() => {
        setIsCollapsedHover(false);
      }}
      onFocusCapture={() => {
        if (!open) {
          setIsCollapsedHover(true);
        }
      }}
      onBlurCapture={() => {
        setIsCollapsedHover(false);
      }}
    >
      <SidebarHeader
        className={cn("flex items-center", { "pt-8": isMacos })}
        data-tauri-drag-region="true"
      >
        <div className="flex w-full items-center justify-center rounded-md px-0 py-2 [&_svg]:cursor-default">
          <EthuiLogo size={48} bg="bg-transparent" fg={logoFill} />
        </div>
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
                  showExpanded={showExpandedSidebar}
                  hideWhenCollapsed
                />
              )}
              {items.map((item) => (
                <CustomSidebarMenuItem
                  key={item.title}
                  showExpanded={showExpandedSidebar}
                  {...item}
                />
              ))}
            </SidebarMenu>
            <SidebarSection
              icon={<Globe />}
              title="Explorer"
              items={getExplorerItems(isAnvilNetwork)}
              showExpanded={showExpandedSidebar}
            />
            <SidebarSection
              icon={<Cog />}
              title="Settings"
              items={settingsItems}
              showExpanded={showExpandedSidebar}
            />
          </SidebarGroupContent>
        </SidebarGroup>
        {showExpandedSidebar && (
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
  showExpanded: boolean;
  hideWhenCollapsed?: boolean;
}

function CustomSidebarMenuItem({
  url,
  icon,
  title,
  showExpanded,
  hideWhenCollapsed = false,
}: CustomSidebarMenuItemProps) {
  const location = useLocation();
  const isActive = isRouteActive(location.pathname, url);
  const shouldHide = hideWhenCollapsed && !showExpanded;

  return (
    <SidebarMenuItem
      className={cn(
        "transition-opacity duration-200",
        shouldHide && "pointer-events-none opacity-0",
      )}
    >
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className={cn(
          isActive &&
            showExpanded &&
            "bg-primary text-accent hover:bg-primary hover:text-accent",
          showExpanded &&
            "group-data-[collapsible=icon]:!h-8 group-data-[collapsible=icon]:!w-full group-data-[collapsible=icon]:!justify-start group-data-[collapsible=icon]:!px-2",
        )}
      >
        <Link to={url}>
          {icon}
          <span
            data-sidebar-label
            className={cn(
              "transition-opacity duration-200",
              showExpanded ? "opacity-100" : "opacity-0",
            )}
          >
            {title}
          </span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

interface SidebarSectionProps {
  icon: React.ReactNode;
  title: string;
  items: Array<{ title: string; url: string }>;
  showExpanded: boolean;
}

function SidebarSection({
  icon,
  title,
  items,
  showExpanded,
}: SidebarSectionProps) {
  const location = useLocation();

  return (
    <div
      className={cn(
        "mt-4 flex flex-col gap-1 transition-opacity duration-200",
        showExpanded
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0",
      )}
    >
      <SidebarGroupLabel className="gap-2">
        {icon}
        <span
          data-sidebar-label
          className={cn(
            "transition-opacity duration-200",
            showExpanded ? "opacity-100" : "opacity-0",
          )}
        >
          {title}
        </span>
      </SidebarGroupLabel>
      <SidebarMenu
        className={cn(
          "pl-6 transition-opacity duration-200",
          showExpanded ? "opacity-100" : "opacity-0",
        )}
      >
        {items.map((item) => {
          const isActive = isRouteActive(location.pathname, item.url);

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                className={cn(
                  isActive &&
                    showExpanded &&
                    "bg-primary text-accent hover:bg-primary hover:text-accent",
                  showExpanded &&
                    "group-data-[collapsible=icon]:!h-8 group-data-[collapsible=icon]:!w-full group-data-[collapsible=icon]:!justify-start group-data-[collapsible=icon]:!px-2",
                )}
              >
                <Link to={item.url}>
                  <span
                    data-sidebar-label
                    className={cn(
                      "transition-opacity duration-200",
                      showExpanded ? "opacity-100" : "opacity-0",
                    )}
                  >
                    {item.title}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </div>
  );
}

function getExplorerItems(isAnvilNetwork: boolean) {
  return explorerItems.filter((item) => !item.anvilOnly || isAnvilNetwork);
}

function isRouteActive(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(`${url}/`);
}
// Menu items.
const items = [
  {
    title: "Account",
    url: "/home/account",
    icon: <CircleUser />,
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
  { title: "Wallets", url: "/home/settings/wallets" },
  { title: "Foundry", url: "/home/settings/foundry" },
  { title: "Tokens", url: "/home/settings/tokens" },
  { title: "About", url: "/home/settings/about" },
];
