import { AppBar, Grid, Toolbar } from "@mui/material";

import { useTheme } from "../store";
import { QuickAddressSelect, QuickNetworkSelect, QuickWalletSelect } from "./";

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
          <Grid item></Grid>
        </Grid>
      </Toolbar>
    </AppBar>
  );
}
