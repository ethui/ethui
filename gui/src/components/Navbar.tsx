import Settings from "@mui/icons-material/Settings";
import { AppBar, Grid, IconButton, Toolbar } from "@mui/material";
import { useState } from "react";

import { useTheme } from "../store";
import {
  Modal,
  QuickAddressSelect,
  QuickNetworkSelect,
  QuickWalletSelect,
  Settings as SettingsPage,
} from "./";
import { Logo } from "./Logo";

export function Navbar() {
  const palette = useTheme((s) => s.theme.palette);

  return (
    <AppBar
      position="sticky"
      sx={{
        background: palette.background.default,
        color: palette.text.primary,
        boxShadow: "none",
      }}
    >
      <Toolbar>
        <Logo width={40} />
        <Grid
          container
          spacing={2}
          justifyContent="flex-end"
          alignItems="center"
        >
          <Grid item>
            <QuickWalletSelect />
          </Grid>
          <Grid item>
            <QuickAddressSelect />
          </Grid>
          <Grid item>
            <QuickNetworkSelect />
          </Grid>
          <Grid item>
            <SettingsButton />
          </Grid>
        </Grid>
      </Toolbar>
    </AppBar>
  );
}

function SettingsButton() {
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
