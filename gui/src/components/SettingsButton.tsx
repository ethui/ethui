import Settings from "@mui/icons-material/SettingsSharp";
import { Button, IconButton } from "@mui/material";
import { useState } from "react";

import { Modal, Settings as SettingsPage } from "./";
import { useTheme } from "../store";

export function SettingsButton() {
  const [showSettings, setShowSettings] = useState(false);
  const { theme } = useTheme();

  return (
    <>
      <IconButton
        onClick={() => setShowSettings(true)}
        color="inherit"
        sx={{
          height: 40,
          width: 40,
          display: "none",
          [theme.breakpoints.down("md")]: {
            display: "initial",
          },
        }}
      >
        <Settings />
      </IconButton>

      <Button
        color="inherit"
        fullWidth
        startIcon={<Settings />}
        onClick={() => setShowSettings(true)}
        sx={{
          justifyContent: "flex-start",
          [theme.breakpoints.down("md")]: {
            display: "none",
          },
        }}
      >
        Settings
      </Button>

      <Modal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        sx={{
          width: "80%",
          height: "80%",
        }}
      >
        <SettingsPage />
      </Modal>
    </>
  );
}
