import { Box, Button, Container, Drawer, Stack } from "@mui/material";
import { grey } from "@mui/material/colors";
import { find } from "lodash-es";
import { useState } from "react";

import { useTheme } from "../../store";
import { SettingsGeneral } from "./General";
import { SettingsNetwork } from "./Network";
import { SettingsWallets } from "./Wallets";

const TABS = [
  { name: "General", component: SettingsGeneral },
  { name: "Wallets", component: SettingsWallets },
  { name: "Network", component: SettingsNetwork },
];

const WIDTH = 120;

export function Settings() {
  const [currentTab, setCurrentTab] = useState(TABS[0].name);

  const tab = find(TABS, { name: currentTab });

  return (
    <Container sx={{ margin: "initial" }} disableGutters>
      <Drawer
        PaperProps={{
          variant: "lighter",
          sx: {
            width: WIDTH,
          },
        }}
        sx={{ flexShrink: 0 }}
        variant="permanent"
      >
        <Box flexGrow={1} display="flex" flexDirection="column">
          <Stack p={2} rowGap={1} flexGrow={1}>
            {TABS.map((tab) => (
              <SidebarTab
                key={tab.name}
                tab={tab}
                selected={tab.name === currentTab}
                onSelect={() => setCurrentTab(tab.name)}
              />
            ))}
          </Stack>
        </Box>
      </Drawer>
      <Box
        sx={{
          maxWidth: `calc(100% - ${WIDTH}px)`,
          ml: `${WIDTH}px`,
          width: "100%",
        }}
      >
        {tab && <tab.component />}
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
  const { theme } = useTheme();
  const backgroundColor = theme.palette.mode === "dark" ? 800 : 200;

  return (
    <Button
      color="inherit"
      disabled={selected}
      onClick={onSelect}
      sx={{
        justifyContent: "flex-start",
        "&.Mui-disabled": {
          backgroundColor: grey[backgroundColor],
        },
      }}
    >
      {tab.name}
    </Button>
  );
}
