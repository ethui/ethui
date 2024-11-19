import { createFileRoute } from "@tanstack/react-router";

import { Input } from "@ethui/ui/components/shadcn/input";
import { useState } from "react";
import { AppNavbar } from "#/components/AppNavbar";

export const Route = createFileRoute("/home/_l/settings/keybinds")({
  component: () => (
    <>
      <AppNavbar title="Settings » Keybinds" />
      <div className="m-4">
        <SettingsKeybinds />
      </div>
    </>
  ),
});

function SettingsKeybinds() {
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
      <div className="flex flex-col gap-0">
        <div className="flex flex-row justify-between gap-3.5">
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
        <ul>
          {filteredKeybinds.length ? (
            filteredKeybinds.map((keybind) => (
              <li className="flex p-3" key={keybind.combination}>
                {keybind.name}
                <div className="border">
                  <span className="break-words font-mono">
                    {keybind.combination}
                  </span>
                </div>
              </li>
            ))
          ) : (
            <li>No keybinds found.</li>
          )}
        </ul>
      </div>
    </>
  );
}
