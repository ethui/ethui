import { Route, Switch } from "wouter";

import { useNoticeAlchemyKeyMissing, useNoticeNewVersion } from "@/hooks";

import { DEFAULT_TAB, SidebarLayout, TABS } from "./Sidebar";
import { ErrorHandler, Navbar, NestedRoutes } from "./";

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
                <ErrorHandler>
                  <Navbar tab={tab} />
                  <tab.component />
                </ErrorHandler>
              </>
            </Route>
          ))}
          <Route>
            <ErrorHandler>
              <Navbar tab={DEFAULT_TAB} />
              <DEFAULT_TAB.component />
            </ErrorHandler>
          </Route>
        </Switch>
      </NestedRoutes>
    </SidebarLayout>
  );
}
