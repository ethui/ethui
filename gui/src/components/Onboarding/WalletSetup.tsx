import { Box } from "@mui/material";

import { Button } from "@ethui/ui/components/ui/button";
import { SettingsWallets } from "#/components/Settings/Wallets";
import type { StepProps } from ".";

export function WalletSetupStep({ onSubmit }: StepProps) {
  return (
    <div className="m-3 flex flex-col items-end">
      <h1 className="self-start text-xl">Wallet setup</h1>

      <p>
        A default (insecure) developer wallet is already set up for you. You can
        opt out by deleting it, and create additional secure wallets for daily
        use.
      </p>
      <Box sx={{ maxWidth: "100%", width: "100%" }}>
        <SettingsWallets
          extraAction={<Button onClick={onSubmit}>Next</Button>}
        />
      </Box>
    </div>
  );
}
