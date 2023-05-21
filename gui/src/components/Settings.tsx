import { Container, Tab, Tabs } from "@mui/material";
import { useState } from "react";

import { SettingsGeneral } from "./SettingsGeneral";
import { SettingsNetwork } from "./SettingsNetwork";
import { SettingsWallet } from "./SettingsWallet";
import { TabPanel } from "./TabPanel";

const tabs = [
  { name: "General", component: SettingsGeneral },
  { name: "Wallet", component: SettingsWallet },
  { name: "Network", component: SettingsNetwork },
];

export function Settings() {
  const [currentTab, setCurrentTab] = useState(0);

  return (
    <Container disableGutters maxWidth="md">
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
