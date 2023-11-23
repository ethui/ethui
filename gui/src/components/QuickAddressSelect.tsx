import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { map } from "lodash-es";
import { Address } from "viem";

import { useInvoke } from "@/hooks";
import { useWallets } from "@/store";
import { Wallet } from "@/types/wallets";

import { AddressView } from "./";

export function QuickAddressSelect() {
  const [currentWallet, setCurrentAddress] = useWallets((s) => [
    s.currentWallet,
    s.setCurrentAddress,
  ]);
  const { data: addresses } = useInvoke<[string, Address][]>(
    "wallets_get_wallet_addresses",
    { name: currentWallet?.name },
  );

  const handleChange = (event: SelectChangeEvent<string | undefined>) => {
    if (!event.target.value) return;
    setCurrentAddress(event.target.value);
  };

  const renderValue = (v: string) => {
    const address = addresses?.find(([key]) => key === v)?.[1];
    return address && <AddressView contextMenu={false} address={address} />;
  };

  if (!addresses || !currentWallet) return <>Loading</>;

  return (
    <FormControl fullWidth variant="standard">
      <InputLabel id="account-select-label">Account</InputLabel>
      <Select
        label="Account"
        labelId="account-select-label"
        onChange={handleChange}
        renderValue={renderValue}
        size="small"
        value={getCurrentPath(currentWallet, addresses)}
      >
        {map(addresses, ([key, address]) => (
          <MenuItem value={key} key={key}>
            <AddressView contextMenu={false} address={address} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function getCurrentPath(wallet: Wallet, addresses: [string, Address][]) {
  switch (wallet.type) {
    case "HDWallet":
      return wallet.current ? wallet.current[0] : addresses[0][0];

    case "PGPWallet":
      return wallet.current ? wallet.current[0] : addresses[0][0];

    case "impersonator":
      return wallet.addresses[wallet.current || 0];

    case "jsonKeystore":
    case "plaintext":
      return wallet.currentPath;

    case "ledger":
      return wallet.addresses[wallet.current || 0][0];
  }
}
