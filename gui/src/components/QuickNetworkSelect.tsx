import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from "@mui/material";
import { useShallow } from "zustand/shallow";

import { ChainView } from "@ethui/react/components/ChainView";
import { useNetworks } from "#/store/useNetworks";

export function QuickNetworkSelect() {
  const [networks, current, setCurrent] = useNetworks(
    useShallow((s) => [s.networks, s.current, s.setCurrent]),
  );

  const handleChange = (event: SelectChangeEvent<string>) =>
    setCurrent(event.target.value);

  if (!networks || !current) return <>Loading</>;

  return (
    <FormControl fullWidth variant="standard">
      <InputLabel id="network-select-label">Network</InputLabel>
      <Select
        labelId="network-select-label"
        label="Network"
        size="small"
        onChange={handleChange}
        value={current.name}
      >
        {networks.map((network) => (
          <MenuItem key={network.chain_id} value={network.name}>
            <ChainView chainId={network.chain_id} name={network.name} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
