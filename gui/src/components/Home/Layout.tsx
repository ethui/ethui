import { Route, Switch } from "wouter";
import { Box, Theme } from "@mui/material";

import { useNoticeAlchemyKeyMissing, useNoticeNewVersion } from "@/hooks";
import {
  DEFAULT_TAB,
  SidebarLayout,
  TABS,
  Sidebar,
} from "@/components/Sidebar";
import { ErrorHandler, Navbar, NestedRoutes } from "@/components";
import { useTheme } from "@/store";

const WIDTH_MD = 200;
const WIDTH_SM = 72;

const contentStyle = (theme: Theme) => {
  return {
    pl: `${WIDTH_MD}px`,
    transition: theme.transitions.create("padding-left"),
    [theme.breakpoints.down("sm")]: {
      pl: `${WIDTH_SM}px`,
    },
  };
};

const drawerPaperStyle = (theme: Theme) => {
  return {
    width: WIDTH_MD,
    transition: theme.transitions.create("width"),
    [theme.breakpoints.down("sm")]: {
      width: WIDTH_SM,
      justifyContent: "center",
    },
  };
};

export function HomePageLayout() {
  useNoticeAlchemyKeyMissing();
  useNoticeNewVersion();
  const { theme } = useTheme();

  return (
    <>
      <Sidebar />
      <Box sx={contentStyle(theme)}>
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
      </Box>
    </>
  );
}
