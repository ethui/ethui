import { MenuItem, Select, SelectChangeEvent } from "@mui/material";

import { useCurrentNetwork } from "../hooks/useCurrentNetwork";
import { useNetworks } from "../hooks/useNetworks";

export function QuickNetworkSelect() {
  const { networks } = useNetworks();
  const { currentNetwork, setCurrentNetwork } = useCurrentNetwork();

  const handleChange = (event: SelectChangeEvent<string>) =>
    setCurrentNetwork(event.target.value);

  if (!networks || !currentNetwork) return <>Loading</>;

  return (
    <Select
      size="small"
      onChange={handleChange}
      value={currentNetwork.name}
      label=""
    >
      {networks.map((network) => (
        <MenuItem value={network.name} key={network.name}>
          {network.name}
        </MenuItem>
      ))}
    </Select>
  );
}
