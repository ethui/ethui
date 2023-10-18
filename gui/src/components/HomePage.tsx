import { Route, Switch } from "wouter";

import { useNoticeAlchemyKeyMissing, useNoticeNewVersion } from "@/hooks";

import { Navbar, NestedRoutes } from "./";
import { DEFAULT_TAB, SidebarLayout, TABS } from "./Sidebar";

export function HomePage() {
  useNoticeAlchemyKeyMissing();
  useNoticeNewVersion();

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
    </SidebarLayout>
  );
}
