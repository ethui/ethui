import type { Network } from "@ethui/types/network";
import { ChainView } from "@ethui/ui/components/chain-view";
import { Button } from "@ethui/ui/components/shadcn/button";
import { ScrollArea } from "@ethui/ui/components/shadcn/scroll-area";
import { Check } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { useNetworks } from "#/store/useNetworks";

interface NetworkSelectorProps {
  networks: Network[];
}

export function NetworkSelector({ networks }: NetworkSelectorProps) {
  const [currentNetwork, setCurrentNetwork] = useNetworks(
    useShallow((s) => [s.current, s.setCurrent]),
  );

  if (!currentNetwork) {
    return null;
  }

  return (
    <>
      {networks.length > 0 && (
        <div>
          <h3 className="p-2 font-medium text-muted-foreground text-sm">
            Network
          </h3>

          <ScrollArea className="max-h-96">
            <NetworkGrid
              networks={networks}
              currentNetwork={currentNetwork}
              onSelect={setCurrentNetwork}
            />
          </ScrollArea>
        </div>
      )}
    </>
  );
}

interface NetworkGridProps {
  networks: Network[];
  currentNetwork: Network;
  onSelect: (networkName: string) => void;
}

function NetworkGrid({ networks, currentNetwork, onSelect }: NetworkGridProps) {
  return (
    <div className="flex flex-wrap">
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
  network: Network;
  isSelected: boolean;
  onSelect: (networkName: string) => void;
}

function NetworkButton({ network, isSelected, onSelect }: NetworkButtonProps) {
  return (
    <Button
      variant={"ghost"}
      className="flex h-auto w-full items-center justify-between px-2"
      onClick={() => onSelect(network.name)}
    >
      <ChainView
        chainId={network.dedup_chain_id.chain_id}
        name={network.name}
        status={network.status}
      />
      {isSelected && <Check className="h-5 w-5" color="green" />}
    </Button>
  );
}
