import { find } from "lodash-es";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@ethui/ui/components/shadcn/dialog";
import { DialogDescription } from "@radix-ui/react-dialog";
import { ScrollArea } from "@ethui/ui/components/shadcn/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarProvider,
} from "#/components/shadcn/sidebar";
import { useSettingsWindow } from "#/store/useSettingsWindow";
import { SettingsFoundry } from "./Foundry";
import { SettingsGeneral } from "./General";
import { SettingsKeybinds } from "./Keybinds";
import { SettingsNetwork } from "./Network";
import { SettingsTokens } from "./Tokens";
import { SettingsWallets } from "./Wallets";
import { cn } from "#/lib/utils";

const TABS = [
  { name: "General", component: SettingsGeneral },
  { name: "Wallets", component: SettingsWallets },
  { name: "Network", component: SettingsNetwork },
  { name: "Foundry", component: SettingsFoundry },
  { name: "Keybinds", component: SettingsKeybinds },
  { name: "Tokens", component: SettingsTokens },
];

export function SettingsDialog() {
  const [currentTab, setCurrentTab] = useState(TABS[0].name);
  const { show: open, toggle } = useSettingsWindow();

  const tab = find(TABS, { name: currentTab });

  return (
    <Dialog open={open} onOpenChange={toggle}>
      <DialogContent className="h-[50vh] min-h-[50vh] min-w-[70vw]">
        <SidebarProvider style={{ "--sidebar-width": "8rem" }}>
          <Sidebar>
            <SidebarContent>
              <SidebarGroup>
                <SidebarMenu>
                  {TABS.map((tab) => (
                    <SidebarMenuButton
                      key={tab.name}
                      className={cn(
                        currentTab === tab.name &&
                        "bg-primary text-accent hover:bg-primary hover:text-accent",
                      )}
                      onClick={() => setCurrentTab(tab.name)}
                    >
                      {tab.name}
                    </SidebarMenuButton>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          {tab && (
            <div className="flex flex-col w-full">
              <DialogTitle className="mb-5">{tab.name}</DialogTitle>
              <DialogDescription>
                <tab.component />
              </DialogDescription>
            </div>
          )}
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}
