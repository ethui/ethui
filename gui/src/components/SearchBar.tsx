import React, {ChangeEvent} from "react";
import TextField from "@mui/material/TextField";

interface SearchBarProps {
  onSearch: (term: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({onSearch}) => {
  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const searchTerm = event.target.value;
    onSearch(searchTerm);
  };

  return (
    <TextField
      label='Search'
      variant='outlined'
      fullWidth
      onChange={handleSearch}
    />
  );
};

export default SearchBar;
