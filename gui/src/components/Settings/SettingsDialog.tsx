import { Button } from "@mui/material";
import { find } from "lodash-es";
import { useState } from "react";

import { useSettingsWindow } from "#/store/useSettingsWindow";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
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
      <DialogContent className="min-h-[50vh] min-w-[70vw]">
        <div className="flex">
          <div className="flex grow flex-col">
            <div className="grow flex-col gap-y-px px-3 py-2">
              {TABS.map((tab) => (
                <SidebarTab
                  key={tab.name}
                  tab={tab}
                  selected={tab.name === currentTab}
                  onSelect={() => setCurrentTab(tab.name)}
                />
              ))}
            </div>
          </div>
          <div className="ml-36 w-full">
            {tab && (
              <>
                <DialogTitle>{tab.name}</DialogTitle> <tab.component />
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SidebarTabProps {
  tab: (typeof TABS)[number];
  selected: boolean;
  onSelect: () => unknown;
}

function SidebarTab({ tab, onSelect, selected }: SidebarTabProps) {
  return (
    <Button variant="sidebar" onClick={onSelect} disabled={selected}>
      {tab.name}
    </Button>
  );
}
