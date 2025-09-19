import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandList,
  CommandSeparator,
} from "@ethui/ui/components/shadcn/command";
import { useEffect, useState } from "react";
import { useUI } from "#/store/useUI";
import { ExplorerHints, ExplorerSearchResults } from "./Explorer";
import { QuickActions } from "./QuickActions";

export function SearchBar() {
  const { searchBar: open, setSearchBar: setOpen, toggleSearchBar } = useUI();
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleSearchBar();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleSearchBar]);

  const handleClose = () => setOpen(false);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search hashes, addresses or quick actions"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No commands found</CommandEmpty>

        {!search && (
          <>
            <ExplorerHints />
            <CommandSeparator />
          </>
        )}

        <ExplorerSearchResults search={search} onClose={handleClose} />

        <QuickActions onClose={handleClose} />
      </CommandList>
    </CommandDialog>
  );
}
