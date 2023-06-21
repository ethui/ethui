import { MenuItem, Select, SelectChangeEvent } from "@mui/material";

import { useNetworks } from "../store";

export function QuickNetworkSelect() {
  const [networks, current, setCurrent] = useNetworks((s) => [
    s.networks,
    s.current,
    s.setCurrent,
  ]);

  const handleChange = (event: SelectChangeEvent<string>) =>
    setCurrent(event.target.value);

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
