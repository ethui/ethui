import {
  Box,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";

import { useWallets } from "@/store";

const MAX_CHANGE_WALLET_SHORTCUTS = 9;

export function SettingsKeybinds() {
  const { wallets } = useWallets();
  const keybinds = [
    { name: "Open / Close Search bar", combination: "Ctrl + K" },
    { name: "Switch between Sidebar menus", combination: "Ctrl + [1..4]" },
    {
      name: "Switch between Wallets",
      combination: `Ctrl + Shift + [1..${Math.min(
        wallets.length,
        MAX_CHANGE_WALLET_SHORTCUTS,
      )}]`,
    },
    { name: "Open / Close Settings menu", combination: "Ctrl + S" },
    { name: "Toggle Fast Mode", combination: "Ctrl + F" },
  ];
  const [search, setSearch] = useState("");
  const [filteredKeybinds, setFilteredKeybinds] = useState(keybinds);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const currentSearch = event.target.value;
    setSearch(currentSearch);

    const filteredItems = keybinds.filter((keybind) =>
      keybind.name.toLowerCase().includes(currentSearch.toLowerCase()),
    );

    setFilteredKeybinds(filteredItems);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography variant="h6">Search keybinds</Typography>
          <Typography>Showing {filteredKeybinds.length} keybinds.</Typography>
        </Box>
        <TextField
          value={search}
          onChange={handleSearch}
          id="outlined-required"
          label="Filter..."
        />
      </Box>
      <Box sx={{ marginTop: 4 }}>
        {filteredKeybinds.length != 0 ? (
          filteredKeybinds.map((keybind) => (
            <ListItem
              key={keybind.combination}
              sx={{ borderBottom: 1, px: 0, py: 3 }}
              secondaryAction={
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Box
                    sx={{
                      border: 1,
                      borderRadius: 2,
                      paddingInline: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        overflowWrap: "break-word",
                        fontFamily: "Roboto Mono",
                        borderRadius: 1,
                        padding: 0.3,
                      }}
                    >
                      {keybind.combination}
                    </Typography>
                  </Box>
                  {/* TODO: Import and add functionality to this button */}
                  {/* <Button>
                    <AddCircleOutlineIcon />
                  </Button> */}
                </Stack>
              }
            >
              <ListItemText primary={`${keybind.name}`} />
            </ListItem>
          ))
        ) : (
          <ListItem>No keybinds found.</ListItem>
        )}
      </Box>
    </Box>
  );
}
