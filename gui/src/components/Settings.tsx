import { Container, Tab, Tabs } from "@mui/material";
import React from "react";
import { useState } from "react";

import { SettingsNetwork } from "./SettingsNetwork";
import { SettingsWallets } from "./SettingsWallets";
import { TabPanel } from "./TabPanel";

const tabs = [
  { name: "Wallets", component: SettingsWallets },
  { name: "Network", component: SettingsNetwork },
];

export function Settings() {
  const [currentTab, setCurrentTab] = useState(0);

  return (
    <Container maxWidth="md">
      <Tabs
        sx={{ mb: 2 }}
        value={currentTab}
        onChange={(_e, newTab) => setCurrentTab(newTab)}
      >
        {tabs.map((tab) => (
          <Tab key={tab.name} label={tab.name} />
        ))}
      </Tabs>
      {tabs.map((tab, index) => (
        <TabPanel index={index} key={tab.name} value={currentTab}>
          <tab.component />
        </TabPanel>
      ))}
    </Container>
  );
}
