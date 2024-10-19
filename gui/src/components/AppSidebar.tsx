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
  SidebarRail,
} from "#/components/ui/sidebar";
import { Link } from "@tanstack/react-router";
import { Calendar, Home, Inbox, Search, Cog } from "lucide-react";
import { Logo } from "./Logo";
import { useSettingsWindow } from "#/store/useSettingsWindow";
import { QuickWalletSelect } from "./QuickWalletSelect";
import { QuickAddressSelect } from "./QuickAddressSelect";
import { QuickNetworkSelect } from "./QuickNetworkSelect";
import { QuickFastModeToggle } from "./QuickFastModeToggle";
import { useKBar } from "kbar";

export function AppSidebar() {
  const { toggle: settingsToggle } = useSettingsWindow();
  const kbar = useKBar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Logo width={40} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <QuickWalletSelect />
          <QuickAddressSelect />
          <QuickNetworkSelect />
          <QuickFastModeToggle />
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={kbar.query.toggle}>
              <Cog />
              <span>Command Bar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={settingsToggle}>
              <Cog />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

// Menu items.
const items = [
  {
    title: "Account",
    url: "/home/account",
    icon: Home,
  },
  {
    title: "Transactions",
    url: "/home/transactions",
    icon: Inbox,
  },
  {
    title: "Contracts",
    url: "/home/contracts",
    icon: Calendar,
  },
  {
    title: "Connections",
    url: "/home/connections",
    icon: Search,
  },
];
