import { Container, Paper, Tab, Tabs } from "@mui/material";
import React from "react";
import { useState } from "react";

import { Balances } from "./Balances";
import { Connections } from "./Connections";
import { Contracts } from "./Contracts";
import { Details } from "./Details";
import { TabPanel } from "./TabPanel";
import { Txs } from "./Txs";

const tabs = [
  { name: "Details", component: Details },
  { name: "Transactions", component: Txs },
  { name: "Balances", component: Balances },
  { name: "Contracts", component: Contracts },
  { name: "Connections", component: Connections },
];

export function HomePage() {
  const [currentTab, setCurrentTab] = useState(0);

  return (
    <Container maxWidth="md">
      <Paper>
        <Tabs
          variant="fullWidth"
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
      </Paper>
    </Container>
  );
}
