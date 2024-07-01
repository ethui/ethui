import { Box, Stack, Typography } from "@mui/material";

import type { StepProps } from ".";

import { Button } from "@ethui/react/components";
import { SettingsWallets } from "@/components/Settings/Wallets";

export function WalletSetupStep({ onSubmit }: StepProps) {
  return (
    <Stack alignItems="flex-end" spacing={3}>
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
          extraAction={
            <Button label="Next" variant="contained" onClick={onSubmit} />
          }
        />
      </Box>
    </Stack>
  );
}
