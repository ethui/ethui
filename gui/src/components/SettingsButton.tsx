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
        size="small"
        sx={{
          height: 40,
          width: 40,
          display: "none",
          [theme.breakpoints.down("sm")]: {
            display: "initial",
          },
        }}
      >
        <Settings />
      </IconButton>

      <Button
        variant="sidebar"
        startIcon={<Settings />}
        onClick={() => setShowSettings(true)}
        sx={{
          [theme.breakpoints.down("sm")]: {
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
          outline: "none",
          width: "90%",
          height: "90%",
          maxWidth: "900px",
        }}
      >
        <SettingsPage />
      </Modal>
    </>
  );
}
