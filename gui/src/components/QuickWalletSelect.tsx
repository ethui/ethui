import { MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { useSWRConfig } from "swr";

import { useInvoke } from "../hooks/tauri";
import { Wallet } from "../types";

export function QuickWalletSelect() {
  const { mutate } = useSWRConfig();
  const { data: wallets } = useInvoke<Wallet[]>("wallets_get_all");
  const { data: current } = useInvoke<Wallet>("wallets_get_current");

  const handleChange = (event: SelectChangeEvent<number>) => {
    const idx = event.target.value as number;
    if (!wallets || !current || current.name == wallets[idx].name) return;

    (async () => {
      await invoke("wallets_set_current_wallet", { idx });
      // TODO: should actually listen to the global wallet changed event
    })();
    mutate(() => true);
  };

  if (!wallets || !current) return <>Loading</>;

  return (
    <Select
      size="small"
      renderValue={(i) => wallets[i].name}
      value={wallets.findIndex((wallet) => wallet.name === current.name)}
      onChange={handleChange}
    >
      {wallets.map((wallet, i) => (
        <MenuItem value={i} key={i}>
          {wallet.name}
        </MenuItem>
      ))}
    </Select>
  );
}
