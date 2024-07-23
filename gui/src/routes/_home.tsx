import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Box, Button, MobileStepper, Theme } from "@mui/material";
import {
  RequestQuoteSharp,
  Receipt,
  CallToAction,
  OnlinePredictionSharp,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  Close as CloseIcon,
} from "@mui/icons-material";
import { SnackbarProvider } from "notistack";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api";
import Joyride, { ACTIONS, EVENTS, STATUS } from "react-joyride";

import { Tab } from "@ethui/types/ui";
import { GeneralSettings } from "@ethui/types/settings";
import { useNoticeAlchemyKeyMissing, useNoticeNewVersion } from "@/hooks";
import { CommandBar } from "@/components";
import { useTheme } from "@/store";
import { Sidebar } from "@/components/Home/Sidebar";
import { steps } from "@/components/Tour/Steps";

export const Route = createFileRoute("/_home")({
  component: HomePageLayout,
});

const sidebarWidth = { md: 200, sm: 72 };

export const tabs: Tab[] = [
  {
    path: "/home/account",
    label: "Account",
    icon: RequestQuoteSharp,
  },
  {
    path: "/home/transactions",
    label: "Transactions",
    icon: Receipt,
  },
  {
    path: "/home/contracts",
    label: "Contracts",
    icon: CallToAction,
  },
  {
    path: "/home/connections",
    label: "Connections",
    icon: OnlinePredictionSharp,
  },
];

const contentStyle = (theme: Theme) => {
  return {
    pl: `${sidebarWidth.md}px`,
    transition: theme.transitions.create("padding-left"),
    [theme.breakpoints.down("sm")]: {
      pl: `${sidebarWidth.sm}px`,
    },
  };
};

const drawerPaperStyle = (theme: Theme) => {
  return {
    width: sidebarWidth.md,
    transition: theme.transitions.create("width"),
    [theme.breakpoints.down("sm")]: {
      width: sidebarWidth.sm,
    },
  };
};

export function HomePageLayout() {
  const { theme } = useTheme();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [settings, setSettings] = useState<GeneralSettings | null>(null);

  const handleJoyrideCallback = (data: any) => {
    const { action, index, status, type } = data;

    if ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND].includes(type)) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    } else if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const settingsData = await invoke<GeneralSettings>("settings_get");
      setSettings(settingsData);
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings?.onboarded) {
      const timer = setTimeout(() => {
        setRun(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [settings]);

  const CustomTooltip = ({
    step,
    backProps,
    closeProps,
    primaryProps,
  }: any) => {
    const totalSteps = steps.length;

    return (
      <div
        style={{
          position: "relative",
          padding: "10px",
          backgroundColor: "white",
          color: "black",
          width: "370px",
          borderRadius: 6,
        }}
      >
        <button
          onClick={closeProps.onClick}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "black",
          }}
        >
          <CloseIcon
            style={{ width: "20px", height: "20px", color: "black" }}
          />
        </button>

        <div
          style={{
            padding: "15px",
            margin: "10px",
            fontSize: "15px",
            color: "black",
          }}
        >
          {step.content}
        </div>

        <MobileStepper
          variant="dots"
          steps={totalSteps}
          position="static"
          activeStep={stepIndex}
          sx={{
            maxWidth: 400,
            flexGrow: 1,
            backgroundColor: "white",
            color: "black",
            "& .MuiMobileStepper-dot": {
              backgroundColor: "grey",
            },
            "& .MuiMobileStepper-dotActive": {
              backgroundColor: "black",
            },
          }}
          nextButton={
            <Button
              size="small"
              onClick={primaryProps.onClick}
              style={{ color: "black" }}
            >
              {theme.direction === "rtl" ? (
                <KeyboardArrowLeft style={{ color: "black" }} />
              ) : (
                <KeyboardArrowRight style={{ color: "black" }} />
              )}
            </Button>
          }
          backButton={
            <Button
              size="small"
              onClick={backProps.onClick}
              disabled={stepIndex === 0}
              style={{ color: "black" }}
            >
              {theme.direction === "rtl" ? (
                <KeyboardArrowRight style={{ color: "black" }} />
              ) : (
                <KeyboardArrowLeft style={{ color: "black" }} />
              )}
            </Button>
          }
        />
      </div>
    );
  };

  const isDarkTheme = theme.palette.mode !== "light";

  return (
    <>
      <Joyride
        callback={handleJoyrideCallback}
        continuous
        run={run}
        steps={steps}
        stepIndex={stepIndex}
        tooltipComponent={CustomTooltip}
        disableOverlayClose
        spotlightClicks
        styles={{
          options: {
            arrowColor: "white",
            backgroundColor: "white",
            overlayColor: "rgba(0, 0, 0, 0)",
            primaryColor: "#000",
            textColor: "black",
            zIndex: 10000,
          },
          spotlight: {
            backgroundColor: "transparent",
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.8)",
            borderRadius: 3,
          },
          beaconInner: {
            backgroundColor: isDarkTheme ? "#fff" : "#000",
          },
        }}
      />
      <CommandBar>
        <SnackbarProvider
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          preventDuplicate
          maxSnack={3}
          dense
        >
          <Sidebar
            sx={drawerPaperStyle(theme)}
            tabs={tabs}
            onStartTour={() => {
              setStepIndex(0);
              setRun(true);
            }}
          />
          <Box sx={contentStyle(theme)}>
            <Outlet />
          </Box>
          <Notifications />
        </SnackbarProvider>
      </CommandBar>
    </>
  );
}

function Notifications() {
  useNoticeAlchemyKeyMissing();
  useNoticeNewVersion();

  return null;
}
