import { Route, Switch } from "wouter";

import { Navbar, NestedRoutes, NewVersionNotice } from "./";
import { DEFAULT_TAB, SidebarLayout, TABS } from "./Sidebar";

export function HomePage() {
  return (
    <SidebarLayout>
      <NestedRoutes base="/">
        <Switch>
          {TABS.map((tab) => (
            <Route key={tab.path} path={tab.path}>
              <>
                <Navbar tab={tab} />
                <tab.component />
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
    </SidebarLayout>
  );
}
