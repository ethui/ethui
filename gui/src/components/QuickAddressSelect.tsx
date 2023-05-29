import { MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { map } from "lodash-es";
import { useSWRConfig } from "swr";
import truncateEthAddress from "truncate-eth-address";

import { useInvoke } from "../hooks/tauri";
import { Address, Wallet } from "../types";

export function QuickAddressSelect() {
  const { mutate } = useSWRConfig();
  const { data: current_wallet } = useInvoke<Wallet>("wallets_get_current");
  const { data: addresses } = useInvoke<[string | undefined, Address][]>(
    "wallets_get_wallet_addresses",
    { name: current_wallet?.name }
  );

  const handleChange = (event: SelectChangeEvent<string | undefined>) => {
    const key = event.target.value;
    if (!current_wallet || !addresses) return;

    (async () => {
      await invoke("wallets_set_current_path", {
        key,
      });
      mutate(() => true);
    })();
  };

  const renderValue = (v: string) => {
    const address = addresses?.find(([key]) => key === v)?.[1];
    return address && truncateEthAddress(address);
  };

  if (!addresses || !current_wallet) return <>Loading</>;

  return (
    <Select
      size="small"
      renderValue={renderValue}
      value={current_wallet.currentPath || addresses[0][0]}
      onChange={handleChange}
    >
      {map(addresses, ([key, address]) => (
        <MenuItem value={key} key={key}>
          {address}
        </MenuItem>
      ))}
    </Select>
  );
}
