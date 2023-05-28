import { Container, Paper, Tab, Tabs } from "@mui/material";
import { findIndex, parseInt, range, toString } from "lodash";
import { Link, Route, Switch, useLocation, useRoute } from "wouter";

import { useKeyPress } from "../hooks/useKeyPress";
import { useMenuAction } from "../hooks/useMenuAction";
import { Contracts } from "./Contracts";
import { Details } from "./Details";
import { LivenetPlaceholder } from "./LivenetPlaceholder";
import { NestedRoutes } from "./NestedRoutes";
import { Peers } from "./Peers";
import { Txs } from "./Txs";

const tabs = [
  { path: "details", name: "Details", component: Details },
  { path: "transactions", name: "Transactions", component: Txs, devOnly: true },
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
              <Details />
            </Route>
          </Switch>
        </NestedRoutes>
      </div>
    </Container>
  );
}
