import Settings from "@mui/icons-material/SettingsSharp";
import { Button, IconButton } from "@mui/material";

import { useSettingsWindow, useTheme } from "../store";
import { Modal, Settings as SettingsPage } from "./";

export function SettingsButton() {
  const { show, open, close } = useSettingsWindow();
  const { theme } = useTheme();

  return (
    <>
      <IconButton
        onClick={open}
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
        onClick={open}
        sx={{
          [theme.breakpoints.down("sm")]: {
            display: "none",
          },
        }}
      >
        Settings
      </Button>

      <Modal
        open={show}
        onClose={close}
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
