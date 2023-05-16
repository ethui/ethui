import { Container, Paper, Tab, Tabs } from "@mui/material";
import { appWindow } from "@tauri-apps/api/window";
import { findIndex, parseInt, range, toString } from "lodash";
import React, { useEffect } from "react";
import { Link, Route, Switch, useLocation, useRoute } from "wouter";

import { useKeyPress } from "../hooks/useKeyPress";
import { Balances } from "./Balances";
import { Connections } from "./Connections";
import { Contracts } from "./Contracts";
import { Details } from "./Details";
import { Txs } from "./Txs";

const tabs = [
  { path: "details", name: "Details", component: Details },
  { path: "transactions", name: "Transactions", component: Txs },
  { path: "balances", name: "Balances", component: Balances },
  { path: "contracts", name: "Contracts", component: Contracts },
  { path: "connections", name: "Connections", component: Connections },
];

export function HomePage() {
  const [_match, params] = useRoute(":path");
  const [_location, setLocation] = useLocation();

  useEffect(() => {
    const unlisten = appWindow.listen(
      "go",
      ({ payload }: { payload: string }) => {
        setLocation(payload);
      }
    );

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [setLocation]);

  const handleKeyboardNavigation = (event: KeyboardEvent) => {
    setLocation(tabs[parseInt(event.key) - 1].path);
  };

  useKeyPress(
    range(1, tabs.length + 1).map(toString),
    { meta: true },
    handleKeyboardNavigation
  );

  useKeyPress(
    range(1, tabs.length + 1).map(toString),
    { ctrl: true },
    handleKeyboardNavigation
  );

  return (
    <Container maxWidth="md">
      <Paper>
        <Tabs
          variant="fullWidth"
          sx={{ mb: 2 }}
          value={Math.max(findIndex(tabs, { path: params?.path }), 0)}
        >
          {tabs.map((tab) => (
            <Tab
              LinkComponent={Link}
              href={tab.path}
              key={tab.name}
              label={tab.name}
            />
          ))}
        </Tabs>
        <div role="tabpanel">
          <Switch>
            {tabs.map((tab) => (
              <Route key={tab.path || "/"} path={tab.path}>
                <tab.component />
              </Route>
            ))}
            <Route>
              <Details />
            </Route>
          </Switch>
        </div>
      </Paper>
    </Container>
  );
}
