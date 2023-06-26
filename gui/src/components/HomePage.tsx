import { Container, Tab, Tabs } from "@mui/material";
import { findIndex, parseInt, range, toString } from "lodash-es";
import { Link, Route, Switch, useLocation, useRoute } from "wouter";

import { useKeyPress, useMenuAction } from "../hooks";
import {
  Balances,
  Contracts,
  LivenetPlaceholder,
  NestedRoutes,
  NewVersionNotice,
  Peers,
  Txs,
} from "./";

const tabs = [
  { path: "details", name: "Balances", component: Balances },
  { path: "transactions", name: "Transactions", component: Txs },
  { path: "contracts", name: "Contracts", component: Contracts, devOnly: true },
  { path: "connections", name: "Connections", component: Peers },
];

export function HomePage() {
  const [_match, params] = useRoute("/:path");
  const [_location, setLocation] = useLocation();

  useMenuAction((payload) => setLocation(payload));

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
    <Container disableGutters maxWidth="md">
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
        <NestedRoutes base="/">
          <Switch>
            {tabs.map((tab) => (
              <Route key={tab.path || "/"} path={tab.path}>
                <LivenetPlaceholder devOnly={tab.devOnly}>
                  <tab.component />
                </LivenetPlaceholder>
              </Route>
            ))}
            <Route>
              <Balances />
            </Route>
          </Switch>
        </NestedRoutes>
      </div>
      <NewVersionNotice />
    </Container>
  );
}
