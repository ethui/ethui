import { ChainView } from "@ethui/ui/components/chain-view";
import { Button } from "@ethui/ui/components/shadcn/button";
import { ScrollArea } from "@ethui/ui/components/shadcn/scroll-area";
import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useNetworks } from "#/store/useNetworks";
import { SearchInput } from "./SearchInput";

export function NetworkSelector() {
  const [networks, currentNetwork, setCurrentNetwork] = useNetworks(
    useShallow((s) => [s.networks, s.current, s.setCurrent]),
  );
  const [searchFilter, setSearchFilter] = useState("");

  const filteredNetworks = useMemo(() => {
    if (!networks || !searchFilter) return networks || [];

    const searchTerm = searchFilter.toLowerCase();
    return networks.filter((network) =>
      network.name.toLowerCase().includes(searchTerm),
    );
  }, [networks, searchFilter]);

  if (!networks || !currentNetwork) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="pl-3 font-medium text-muted-foreground text-sm">
        Network
      </h3>
      <SearchInput
        value={searchFilter}
        onChange={setSearchFilter}
        placeholder="Filter"
      />
      <ScrollArea className="max-h-96">
        <NetworkGrid
          networks={filteredNetworks}
          currentNetwork={currentNetwork}
          onSelect={setCurrentNetwork}
        />
      </ScrollArea>
    </div>
  );
}

interface NetworkGridProps {
  networks: any[];
  currentNetwork: any;
  onSelect: (networkName: string) => void;
}

function NetworkGrid({ networks, currentNetwork, onSelect }: NetworkGridProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {networks.map((network) => (
        <NetworkButton
          key={network.name}
          network={network}
          isSelected={network.name === currentNetwork?.name}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

interface NetworkButtonProps {
  network: any;
  isSelected: boolean;
  onSelect: (networkName: string) => void;
}

function NetworkButton({ network, isSelected, onSelect }: NetworkButtonProps) {
  return (
    <Button
      variant={"ghost"}
      className="flex h-auto w-full items-center justify-between gap-2"
      onClick={() => onSelect(network.name)}
    >
      <ChainView
        chainId={network.dedup_chain_id.chain_id}
        name={network.name}
        status={network.status}
      />
      {isSelected && <Check className="h-4 w-4" color="green" />}
    </Button>
  );
}
