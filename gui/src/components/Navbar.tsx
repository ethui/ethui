import Settings from "@mui/icons-material/Settings";
import { Box, Button, Container, Grid, IconButton } from "@mui/material";
import { useState } from "react";
import { Link } from "wouter";

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
  return (
    <Container
      maxWidth={false}
      component="nav"
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        py: 2,
      }}
    >
      <Box flexShrink="0">
        <Button size="medium" component={Link} href="/">
          Iron Wallet
        </Button>
      </Box>
      <Grid container spacing={2} justifyContent="flex-end" alignItems="center">
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
    </Container>
  );
}
