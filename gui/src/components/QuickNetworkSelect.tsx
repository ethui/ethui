import { MenuItem, Select, SelectChangeEvent } from "@mui/material";

import { useNetworks } from "../hooks/useNetworks";

export function QuickNetworkSelect() {
  const { networks, network: current, setNetwork } = useNetworks();

  const handleChange = (event: SelectChangeEvent<string>) =>
    setNetwork(event.target.value);

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
