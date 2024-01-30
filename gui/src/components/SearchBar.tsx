import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

import {useNetworks} from "@/store";
import {useApi} from "@/hooks/useApi";

interface SearchBarProps {
  onSelect: (value: [`0x${string}`, string] | null) => void;
}

const SearchBar = ({onSelect}: SearchBarProps) => {
  const chainId = useNetworks((s) => s.current?.chain_id);
  const {data: contracts = []} = useApi<[`0x${string}`, string][]>(
    "/contracts",
    {
      chainId,
    }
  );

  const handleSelection = (address: `0x${string}`, name: string | null) => {
    onSelect(name ? [address, name] : null);
  };

  return (
    <Autocomplete
      options={contracts}
      getOptionLabel={(option) => `${option[0]}, ${option[1]}`}
      renderInput={(params) => <TextField {...params} label='Search...' />}
      onChange={(_event, value) =>
        handleSelection(value ? value[0] : "0x", value ? value[1] : null)
      }
    />
  );
};

export default SearchBar;
