import { Box, Button, Container, Drawer, Typography } from "@mui/material";
import { find } from "lodash-es";
import { useState } from "react";

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

const WIDTH = 140;

export function Settings() {
  const [currentTab, setCurrentTab] = useState(TABS[0].name);

  const tab = find(TABS, { name: currentTab });

  return (
    <Container sx={{ margin: "initial" }} disableGutters>
      <Drawer
        PaperProps={{
          variant: "lighter",
          sx: {
            py: 2,
            width: WIDTH,
          },
        }}
        sx={{ flexShrink: 0 }}
        variant="permanent"
      >
        <Box className="flex grow flex-col">
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
        </Box>
      </Drawer>
      <Box
        sx={{
          maxWidth: `calc(100% - ${WIDTH}px)`,
          ml: `${WIDTH}px`,
          width: "100%",
        }}
      >
        {tab && (
          <>
            <span mb={3} fontWeight="bold" variant="bordered">
              {tab.name}
            </span>
            <tab.component />
          </>
        )}
      </Box>
    </Container>
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
