import { MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { map } from "lodash";
import { useSWRConfig } from "swr";

import { useInvoke } from "../hooks/tauri";
import { Address, Wallet2 } from "../types";

export function QuickAddressSelect() {
  const { mutate } = useSWRConfig();
  const { data: current_wallet } = useInvoke<Wallet2>("wallets_get_current");
  const { data: addresses } = useInvoke<[string, Address][]>(
    "wallets_get_wallet_addresses",
    { name: current_wallet?.name }
  );

  const handleChange = (event: SelectChangeEvent<string>) => {
    const key = event.target.value;
    if (!current_wallet || !addresses) return;

    (async () => {
      await invoke("wallets_set_current_key", {
        key,
      });
      mutate(() => true);
    })();
  };

  if (!addresses || !current_wallet) return <>Loading</>;

  return (
    <Select
      size="small"
      renderValue={(v: string) => addresses.find(([key]) => key === v)?.[1]}
      value={current_wallet.currentKey}
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
