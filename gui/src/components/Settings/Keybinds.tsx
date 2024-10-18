import {
  Box,
  ListItem,
  ListItemText,
  TextField,
  useMediaQuery,
} from "@mui/material";
import { useState } from "react";

import { useTheme } from "#/store/useTheme";

export function SettingsKeybinds() {
  const { theme } = useTheme();
  const isSmallerScreen = useMediaQuery(theme.breakpoints.down("md"));

  const keybinds = [
    { name: "Toggle Command Bar", combination: "Ctrl + K" },
    { name: "Switch between tabs", combination: "Ctrl + [1..4]" },
    { name: "Open / Close Settings menu", combination: "Ctrl + S" },
    { name: "Toggle Fast mode", combination: "Ctrl + F" },
    {
      name: "Change wallet",
      combination: "W",
    },
    {
      name: "Change network",
      combination: "N",
    },
    {
      name: "Change theme",
      combination: "T",
    },
  ];

  const [search, setSearch] = useState("");
  const [filteredKeybinds, setFilteredKeybinds] = useState(
    keybinds.filter((keybind) => keybind),
  );

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const currentSearch = event.target.value;
    setSearch(currentSearch);

    const filteredItems = keybinds.filter((keybind) =>
      keybind.name.toLowerCase().includes(currentSearch.toLowerCase()),
    );

    setFilteredKeybinds(filteredItems);
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          gap: isSmallerScreen ? "0px" : "30px",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: "15px",
            flexDirection: isSmallerScreen ? "column" : "row",
            justifyContent: "justify-between",
          }}
        >
          <Box>
            <h6>Search keybinds</h6>
            <span>Showing {filteredKeybinds.length} keybinds.</span>
          </Box>
          <TextField
            value={search}
            onChange={handleSearch}
            id="outlined-required"
            label="Filter..."
          />
        </Box>
        <Box>
          {filteredKeybinds.length ? (
            filteredKeybinds.map((keybind) => (
              <ListItem
                key={keybind.combination}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  flexDirection: isSmallerScreen ? "column" : "row",
                  borderBottom: 1,
                  pr: 3,
                  py: 3,
                }}
              >
                <ListItemText primary={keybind.name} />
                <Box sx={{ border: 1, borderRadius: 2, paddingInline: 1 }}>
                  <span className="font-mono break-words rounded-sm">
                    {keybind.combination}
                  </span>
                </Box>
              </ListItem>
            ))
          ) : (
            <ListItem>No keybinds found.</ListItem>
          )}
        </Box>
      </Box>
    </>
  );
}
