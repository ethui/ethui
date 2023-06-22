import Settings from "@mui/icons-material/Settings";
import { AppBar, Grid, IconButton, Toolbar, Typography } from "@mui/material";
import { useState } from "react";

import { useTheme } from "../store/theme";
import { Modal } from "./Modal";
import { QuickAddressSelect } from "./QuickAddressSelect";
import { QuickNetworkSelect } from "./QuickNetworkSelect";
import { QuickWalletSelect } from "./QuickWalletSelect";
import { Settings as SettingsPage } from "./Settings";

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
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Iron&nbsp;Wallet
        </Typography>
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
