import { ChainView } from "@ethui/ui/components/chain-view";
import { Button } from "@ethui/ui/components/shadcn/button";
import { Input } from "@ethui/ui/components/shadcn/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ethui/ui/components/shadcn/popover";
import { ScrollArea } from "@ethui/ui/components/shadcn/scroll-area";
import { Separator } from "@ethui/ui/components/shadcn/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@ethui/ui/components/shadcn/accordion";
import { map } from "lodash-es";
import { ChevronRight, Search, Wallet } from "lucide-react";
import { useState } from "react";
import { type Address, getAddress } from "viem";
import { useShallow } from "zustand/shallow";
import { useInvoke } from "#/hooks/useInvoke";
import { useNetworks } from "#/store/useNetworks";
import { useWallets } from "#/store/useWallets";
import { AddressView } from "./AddressView";
import { WalletView } from "./WalletView";

export function QuickStatusSelect() {
  const [open, setOpen] = useState(false);
  const [currentWallet, setCurrentWallet, setCurrentAddress] = useWallets(
    useShallow((s) => [
      s.currentWallet,
      s.setCurrentWallet,
      s.setCurrentAddress,
    ]),
  );
  const [currentNetwork] = useNetworks(useShallow((s) => [s.current]));

  const { data: addresses } = useInvoke<[string, Address][]>(
    "wallets_get_wallet_addresses",
    { name: currentWallet?.name },
  );

  if (!currentWallet || !currentNetwork || !addresses) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  const currentAddress = getCurrentAddress(currentWallet, addresses);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex flex-col gap-1 p-2 border rounded-md cursor-pointer hover:bg-accent/50">
          <div className="flex items-center gap-2 min-w-0">
            <Wallet className="h-4 w-4 flex-shrink-0" />
            <span className="truncate text-sm font-medium">
              {currentWallet.name}
            </span>
            <div className="flex items-center gap-1 min-w-0 ml-auto">
              <AddressView
                icon
                contextMenu={false}
                address={
                  addresses.find(([path]) => path === currentAddress)?.[1] ||
                  addresses[0][1]
                }
                noTextStyle
              />
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <ChainView
              chainId={currentNetwork.dedup_chain_id.chain_id}
              name={currentNetwork.name}
              status={currentNetwork.status}
            />
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[600px] max-h-[80vh] overflow-y-auto p-4"
        side="bottom"
        align="start"
        sideOffset={8}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <WalletSection
              currentWallet={currentWallet}
              addresses={addresses}
              currentAddress={currentAddress}
              onWalletChange={setCurrentWallet}
              onAddressChange={setCurrentAddress}
            />
          </div>
          <div className="md:hidden block">
            <Separator className="my-4" />
          </div>
          <div>
            <NetworkSection />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface WalletSectionProps {
  currentWallet: any;
  addresses: [string, Address][];
  currentAddress: string;
  onWalletChange: (name: string) => void;
  onAddressChange: (path: string) => void;
}

function WalletSection({
  currentWallet,
  addresses,
  currentAddress,
  onWalletChange,
  onAddressChange,
}: WalletSectionProps) {
  const [wallets] = useWallets(useShallow((s) => [s.wallets]));
  const [expandedWallet, setExpandedWallet] = useState<string>(
    currentWallet?.name || "",
  );
  const [walletFilter, setWalletFilter] = useState("");

  if (!wallets) return null;

  // Filter wallets by name or by any of their addresses
  const filteredWallets = wallets.filter((wallet) => {
    const nameMatch = wallet.name.toLowerCase().includes(walletFilter.toLowerCase());
    
    if (!walletFilter) return true; // Show all wallets if no filter
    
    return nameMatch;
  });

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Wallet</h3>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter"
          value={walletFilter}
          onChange={(e) => setWalletFilter(e.target.value)}
          className="text-sm border-0 bg-muted/50 pl-10"
        />
      </div>
      <ScrollArea className="max-h-96">
        <Accordion
          type="single"
          value={expandedWallet}
          onValueChange={(value) => {
            setExpandedWallet(value || "");
          }}
          collapsible
        >
          {filteredWallets.map((wallet) => (
            <WalletAccordionItem
              key={wallet.name}
              wallet={wallet}
              isCurrentWallet={wallet.name === currentWallet.name}
              addresses={wallet.name === currentWallet.name ? addresses : []}
              currentAddress={currentAddress}
              onWalletChange={onWalletChange}
              onAddressChange={onAddressChange}
              filter={walletFilter}
            />
          ))}
        </Accordion>
      </ScrollArea>
    </div>
  );
}

interface WalletAccordionItemProps {
  wallet: any;
  isCurrentWallet: boolean;
  addresses: [string, Address][];
  currentAddress: string;
  onWalletChange: (name: string) => void;
  onAddressChange: (path: string) => void;
  filter: string;
}

function WalletAccordionItem({
  wallet,
  isCurrentWallet,
  addresses,
  currentAddress,
  onWalletChange,
  onAddressChange,
  filter,
}: WalletAccordionItemProps) {
  const { data: walletAddresses } = useInvoke<[string, Address][]>(
    "wallets_get_wallet_addresses",
    { name: wallet.name },
  );

  const addressesToShow = isCurrentWallet ? addresses : walletAddresses || [];
  
  // Filter addresses based on the search filter
  const filteredAddresses = addressesToShow.filter(([path, address]) => {
    if (!filter) return true;
    return address.toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <AccordionItem value={wallet.name}>
      <AccordionTrigger
        className={`w-full justify-start p-1 h-auto hover:no-underline text-sm ${isCurrentWallet ? "bg-secondary" : ""}`}
      >
        <div className="flex items-center gap-2 w-full">
          <WalletView name={wallet.name} type={wallet.type} />
        </div>
      </AccordionTrigger>
      <AccordionContent className="p-0">
        <div className="ml-2 space-y-0">
          {filteredAddresses.map(([path, address]) => (
            <Button
              key={path}
              variant={path === currentAddress ? "secondary" : "ghost"}
              className="w-full justify-start p-1 h-auto text-xs"
              onClick={() => {
                onWalletChange(wallet.name);
                onAddressChange(path);
              }}
            >
              <AddressView icon contextMenu={false} address={address} />
            </Button>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function NetworkSection() {
  const [networks, currentNetwork, setCurrentNetwork] = useNetworks(
    useShallow((s) => [s.networks, s.current, s.setCurrent]),
  );
  const [networkFilter, setNetworkFilter] = useState("");

  if (!networks || !currentNetwork) return <div>Loading networks...</div>;

  const filteredNetworks = networks.filter((network) =>
    network.name.toLowerCase().includes(networkFilter.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Network</h3>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter"
          value={networkFilter}
          onChange={(e) => setNetworkFilter(e.target.value)}
          className="text-sm border-0 bg-muted/50 pl-10"
        />
      </div>
      <ScrollArea className="max-h-96">
        <div className="flex flex-wrap gap-2">
          {filteredNetworks.map((network) => (
            <Button
              key={network.name}
              variant={
                network.name === currentNetwork?.name ? "secondary" : "ghost"
              }
              className="p-2 h-auto"
              onClick={() => setCurrentNetwork(network.name)}
            >
              <ChainView
                chainId={network.dedup_chain_id.chain_id}
                name={network.name}
                status={network.status}
              />
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function getCurrentAddress(
  wallet: any,
  addresses: [string, Address][],
): string {
  switch (wallet.type) {
    case "HDWallet":
      return wallet.current ? wallet.current[0] : addresses[0][0];
    case "impersonator":
      return (wallet.current || 0).toString();
    case "jsonKeystore":
    case "plaintext":
      return wallet.currentPath;
    case "ledger":
      return wallet.addresses[wallet.current || 0][0];
    case "privateKey":
      return getAddress(wallet.address);
    default:
      return addresses[0]?.[0] || "";
  }
}
