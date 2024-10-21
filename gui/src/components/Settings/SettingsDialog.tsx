import { find } from "lodash-es";
import { useState } from "react";

import { DialogDescription } from "@radix-ui/react-dialog";
import { useSettingsWindow } from "#/store/useSettingsWindow";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@ethui/ui/components/shadcn/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarProvider,
} from "#/components/shadcn/sidebar";
import { SettingsFoundry } from "./Foundry";
import { SettingsGeneral } from "./General";
import { SettingsKeybinds } from "./Keybinds";
import { SettingsNetwork } from "./Network";
import { SettingsTokens } from "./Tokens";
import { SettingsWallets } from "./Wallets";

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
      <DialogContent className="max-h-[70vh] min-h-[50vh] min-w-[70vw]">
        <SidebarProvider style={{ "--sidebar-width": "8rem" }}>
          <Sidebar className="h-full">
            <SidebarContent>
              <SidebarGroup>
                <SidebarMenu>
                  {TABS.map((tab) => (
                    <SidebarMenuButton
                      key={tab.name}
                      isActive={currentTab === tab.name}
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
            <div className="w-full">
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
