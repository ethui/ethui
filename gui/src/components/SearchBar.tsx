import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

import {useContracts} from "@/store";

interface SearchBarProps {
  onSelect: (value: `0x${string}` | null) => void;
}

const SearchBar = ({onSelect}: SearchBarProps) => {
  const addresses = useContracts((s) => s.addresses);
const SearchBar = ({onSelect}: SearchBarProps) => {
  const addresses = useContracts((s) => s.addresses);
  //eslint-disable-next-line
  console.log("TESTEEEEEEEE: " + addresses);

  return (
    <Autocomplete
      options={addresses}
      getOptionLabel={(option) => option}
      renderInput={(params) => <TextField {...params} label='Search...' />}
      onChange={(_event, value) => onSelect(value)}
    />
  );
};

export default SearchBar;