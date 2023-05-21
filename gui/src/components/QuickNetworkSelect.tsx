import { MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import React from "react";

import { useInvoke } from "../hooks/tauri";
import { useRefreshNetwork } from "../hooks/useRefreshNetwork";
import { Network } from "../types";

export function QuickNetworkSelect() {
  const { data: networks } = useInvoke<Network[]>("networks_get_list");
  const { data: current, mutate } = useInvoke<Network>("networks_get_current");

  useRefreshNetwork(mutate);

  const handleChange = async (event: SelectChangeEvent<string>) => {
    const network = event.target.value;

    if (!current || current.name === network) return;

    await invoke("networks_set_current", { network });
    mutate();
  };

  if (!networks || !current) return <>Loading</>;

  return (
    <Select size="small" onChange={handleChange} value={current.name} label="">
      {networks.map((network) => (
        <MenuItem value={network.name} key={network.name}>
          {network.name}
        </MenuItem>
      ))}
    </Select>
  );
}
