import { MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { map } from "lodash-es";

import { useInvoke } from "../hooks";
import { useWallets } from "../store";
import { Address, Wallet } from "../types";
import { AddressView } from "./";

export function QuickAddressSelect() {
  const [currentWallet, setCurrentAddress] = useWallets((s) => [
    s.currentWallet,
    s.setCurrentAddress,
  ]);
  const { data: addresses } = useInvoke<[string, Address][]>(
    "wallets_get_wallet_addresses",
    { name: currentWallet?.name }
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
    <Select
      size="small"
      renderValue={renderValue}
      value={getCurrentPath(currentWallet, addresses)}
      onChange={handleChange}
    >
      {map(addresses, ([key, address]) => (
        <MenuItem value={key} key={key}>
          <AddressView contextMenu={false} address={address} />
        </MenuItem>
      ))}
    </Select>
  );
}

function getCurrentPath(wallet: Wallet, addresses: [string, Address][]) {
  switch (wallet.type) {
    case "HDWallet":
      return wallet.current ? wallet.current[0] : addresses[0][0];

    case "impersonator":
      return wallet.addresses[wallet.current!];

    default:
      return wallet.currentPath || addresses[0][0];
  }
}
