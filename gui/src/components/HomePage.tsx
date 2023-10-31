import { useTour } from "@reactour/tour";
import { useEffect } from "react";
import { Route, Switch } from "wouter";

import { useNoticeAlchemyKeyMissing, useNoticeNewVersion } from "@/hooks";

import { ErrorHandler, Navbar, NestedRoutes } from "./";
import { DEFAULT_TAB, SidebarLayout, TABS } from "./Sidebar";

export function HomePage() {
  const { setIsOpen } = useTour();

  useNoticeAlchemyKeyMissing();
  useNoticeNewVersion();

  useEffect(() => {
    setTimeout(() => {
      setIsOpen(true);
    }, 1000);
  }, [setIsOpen]);

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
