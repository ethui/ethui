import { Box, Typography } from "@mui/material";

import { Button } from "@ethui/ui/components/ui/button";
import { SettingsWallets } from "#/components/Settings/Wallets";
import type { StepProps } from ".";

export function WalletSetupStep({ onSubmit }: StepProps) {
  return (
    <div alignItems="flex-end" m-8>
      <Typography variant="h6" component="h1" alignSelf="start">
        Wallet setup
      </Typography>

      <Typography component="p">
        A default (insecure) developer wallet is already set up for you. You can
        opt out by deleting it, and create additional secure wallets for daily
        use.
      </Typography>
      <Box sx={{ maxWidth: "100%", width: "100%" }}>
        <SettingsWallets
          extraAction={<Button onClick={onSubmit}>Next</Button>}
        />
      </Box>
    </div>
  );
}
