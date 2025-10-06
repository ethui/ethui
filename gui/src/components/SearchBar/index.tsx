import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandList,
} from "@ethui/ui/components/shadcn/command";
import { DialogTitle } from "@ethui/ui/components/shadcn/dialog";
import { useEffect, useState } from "react";
import { useUI } from "#/store/useUI";
import { ExplorerSearchResults } from "./Explorer";
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
    <CommandDialog position="top" open={open} onOpenChange={setOpen}>
      <DialogTitle>
        <CommandInput
          className="font-normal"
          placeholder="Search hashes, addresses or quick actions"
          value={search}
          onValueChange={setSearch}
        />
      </DialogTitle>

      <CommandList className="">
        <CommandEmpty>No commands found</CommandEmpty>

        <ExplorerSearchResults search={search} onClose={handleClose} />

        <QuickActions onClose={handleClose} />
      </CommandList>
    </CommandDialog>
  );
}
