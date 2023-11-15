import { Button } from "@mui/material";

import { PGPWallet, Wallet } from "@/types/wallets";

interface Props {
  wallet?: PGPWallet;

  onSubmit: (data: Wallet) => void;
  onRemove: () => void;
}

export function PGPWalletForm({ wallet, onSubmit, onRemove }: Props) {
  return (
    <>
      <Button color="warning" variant="contained" onClick={onRemove}>
        Remove
      </Button>
    </>
  );
}
