import { Box, Container } from "@mui/material";
import { Route, Switch } from "wouter";

import {
  Balances,
  LivenetPlaceholder,
  NestedRoutes,
  NewVersionNotice,
} from "./";
import { Sidebar, TABS } from "./Sidebar";

export function HomePage() {
  return (
    <Box>
      <Sidebar>
        <Container
          // sx={{ pl: `${DRAWER_WIDTH_MD}px` }}
          disableGutters
          maxWidth="md"
        >
          <NestedRoutes base="/">
            <Switch>
              {TABS.map((tab) => (
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
          <NewVersionNotice />
        </Container>
      </Sidebar>
    </Box>
  );
}
