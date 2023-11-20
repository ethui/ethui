import { useTour } from "@reactour/tour";
import { useEffect } from "react";
import { Route, Switch } from "wouter";

import {
  useInvoke,
  useNoticeAlchemyKeyMissing,
  useNoticeNewVersion,
} from "@/hooks";
import { GeneralSettings } from "@/types/settings";

import { ErrorHandler, Navbar, NestedRoutes } from "./";
import { DEFAULT_TAB, SidebarLayout, TABS } from "./Sidebar";

export function HomePage() {
  const { setIsOpen } = useTour();
  const { data: settings } = useInvoke<GeneralSettings>("settings_get");

  useNoticeAlchemyKeyMissing();
  useNoticeNewVersion();

  useEffect(() => {
    if (!settings) return;

    if (!settings.homepageTourCompleted)
      setTimeout(() => {
        setIsOpen(true);
      }, 500);
  }, [setIsOpen, settings, settings?.homepageTourCompleted]);

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
