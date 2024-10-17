import { Link, useLocation } from "@tanstack/react-router";
import { useCommandBar } from "./CommandBar";
import {
  CircleUser,
  Cog,
  FileCode2,
  ReceiptText,
  Terminal,
  Wifi,
} from "lucide-react";
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
} from "#/components/shadcn/sidebar";
import { useSettingsWindow } from "#/store/useSettingsWindow";
import { Logo } from "./Logo";
import { QuickAddressSelect } from "./QuickAddressSelect";
import { QuickFastModeToggle } from "./QuickFastModeToggle";
import { QuickNetworkSelect } from "./QuickNetworkSelect";
import { QuickWalletSelect } from "./QuickWalletSelect";
import { cn } from "#/lib/utils";

export function AppSidebar() {
  const { toggle: settingsToggle } = useSettingsWindow();
  const commandBar = useCommandBar();
  const location = useLocation();
  console.log(items, location);
  console.log(items[0].url === location.pathname);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex items-center">
        <Logo width={40} />
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <div className="flex flex-col gap-y-3">
            <QuickWalletSelect />
            <QuickAddressSelect />
            <QuickNetworkSelect />
            <QuickFastModeToggle />
          </div>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => commandBar.setOpen(true)}>
              <Terminal />
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
