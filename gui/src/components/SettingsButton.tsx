import Settings from "@mui/icons-material/SettingsSharp";
import { IconButton } from "@mui/material";
import { useState } from "react";
import { Modal, Settings as SettingsPage } from "./";

export function SettingsButton() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <IconButton onClick={() => setShowSettings(true)}>
        <Settings />
      </IconButton>

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
