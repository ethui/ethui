import { ListItem, ListItemText } from "@mui/material";
import { useState } from "react";

import { clsx } from "clsx";
import { Input } from "@ethui/ui/components/shadcn/input";

export function SettingsKeybinds() {
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
      <div className={clsx("flex flex-col", "gap-0")}>
        <div className={clsx("flex justify-between gap-3.5 flex-row")}>
          <div className="shrink-0">
            <h6>Search keybinds</h6>
            <span>Showing {filteredKeybinds.length} keybinds.</span>
          </div>
          <Input
            value={search}
            onChange={handleSearch}
            id="outlined-required"
            placeholder="Filter..."
          />
        </div>
        <div>
          {filteredKeybinds.length ? (
            filteredKeybinds.map((keybind) => (
              <ListItem
                key={keybind.combination}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  flexDirection: "row",
                  borderBottom: 1,
                  pr: 3,
                  py: 3,
                }}
              >
                <ListItemText primary={keybind.name} />
                <div className="rounded-sm border">
                  <span className="break-words rounded-sm font-mono">
                    {keybind.combination}
                  </span>
                </div>
              </ListItem>
            ))
          ) : (
            <ListItem>No keybinds found.</ListItem>
          )}
        </div>
      </div>
    </>
  );
}
