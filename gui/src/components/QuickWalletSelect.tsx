import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from "@mui/material";
import { useShallow } from "zustand/shallow";

import { useWallets } from "#/store/useWallets";

export function QuickWalletSelect() {
  const [wallets, currentWallet, setCurrentWallet] = useWallets(
    useShallow((s) => [s.wallets, s.currentWallet, s.setCurrentWallet]),
  );

  const handleChange = (event: SelectChangeEvent<string>) => {
    setCurrentWallet(event.target.value);
  };

  if (!wallets || !currentWallet) return <>Loading</>;

  return (
    <FormControl variant="standard" fullWidth>
      <InputLabel id="wallet-select-label">Wallet</InputLabel>
      <Select
        label="Wallet"
        labelId="wallet-select-label"
        onChange={handleChange}
        size="small"
        value={currentWallet.name}
      >
        {wallets.map(({ name }) => (
          <MenuItem value={name} key={name}>
            {name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
