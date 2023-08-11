import Settings from "@mui/icons-material/SettingsSharp";
import { Button, IconButton } from "@mui/material";
import { useState } from "react";

import { useTheme } from "../store";
import { Modal, Settings as SettingsPage } from "./";

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
          width: "90%",
          height: "90%",
        }}
      >
        <SettingsPage />
      </Modal>
    </>
  );
}
