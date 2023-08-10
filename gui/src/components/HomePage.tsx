import { Box } from "@mui/material";
import { Route, Switch } from "wouter";

import { LivenetPlaceholder, Navbar, NestedRoutes, NewVersionNotice } from "./";
import { DEFAULT_TAB, Sidebar, TABS } from "./Sidebar";

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
              <Navbar tab={DEFAULT_TAB} />
              <DEFAULT_TAB.component />
            </Route>
          </Switch>
        </NestedRoutes>
        <NewVersionNotice />
      </Sidebar>
    </Box>
  );
}
