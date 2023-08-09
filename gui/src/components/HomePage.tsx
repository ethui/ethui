import { Box } from "@mui/material";
import { Route, Switch } from "wouter";

import { LivenetPlaceholder, Navbar, NestedRoutes, NewVersionNotice } from "./";
import { Sidebar, TABS } from "./Sidebar";

const defaultTab = TABS[0];

export function HomePage() {
  return (
    <Box>
      <Sidebar>
        <NestedRoutes base="/">
          <Switch>
            {TABS.map((tab) => (
              <Route key={tab.path} path={tab.path}>
                <>
                  <Navbar tab={tab} />
                  <LivenetPlaceholder devOnly={tab.devOnly}>
                    <tab.component />
                  </LivenetPlaceholder>
                </>
              </Route>
            ))}
            <Route>
              <Navbar tab={defaultTab} />
              <defaultTab.component />
            </Route>
          </Switch>
        </NestedRoutes>
        <NewVersionNotice />
      </Sidebar>
    </Box>
  );
}
