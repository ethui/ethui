import Settings from "@mui/icons-material/Settings";
import {
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  Modal,
  Paper,
} from "@mui/material";
import React, { useState } from "react";
import { Link } from "wouter";

import { NewVersionWarning } from "./NewVersionWarning";
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
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Paper
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "80%",
            height: "80%",
            overflowY: "scroll",
            p: 4,
          }}
        >
          <SettingsPage />
        </Paper>
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
      <Box flexShrink="0">
        <NewVersionWarning />
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

