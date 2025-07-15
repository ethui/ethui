import { ChainView } from "@ethui/ui/components/chain-view";
import { Button } from "@ethui/ui/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@ethui/ui/components/shadcn/dialog";
import { ScrollArea } from "@ethui/ui/components/shadcn/scroll-area";
import { Separator } from "@ethui/ui/components/shadcn/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ethui/ui/components/shadcn/collapsible";
import { map } from "lodash-es";
import { ChevronDown, ChevronRight, Wallet } from "lucide-react";
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
    useShallow((s) => [s.currentWallet, s.setCurrentWallet, s.setCurrentAddress]),
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
    <>
      <div 
        className="flex flex-col gap-1 p-2 border rounded-md cursor-pointer hover:bg-accent/50"
        onClick={() => setOpen(true)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Wallet className="h-4 w-4 flex-shrink-0" />
          <span className="truncate text-sm font-medium">{currentWallet.name}</span>
          <div className="flex items-center gap-1 min-w-0 ml-auto">
            <AddressView 
              icon 
              contextMenu={false} 
              address={addresses.find(([path]) => path === currentAddress)?.[1] || addresses[0][1]}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>Select Wallet & Network</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <WalletSection
              currentWallet={currentWallet}
              addresses={addresses}
              currentAddress={currentAddress}
              onWalletChange={setCurrentWallet}
              onAddressChange={setCurrentAddress}
            />
            <div className="md:block hidden">
              <Separator orientation="vertical" className="absolute left-1/2 top-16 bottom-6 transform -translate-x-px" />
            </div>
            <div className="md:hidden block">
              <Separator />
            </div>
            <NetworkSection />
          </div>
        </DialogContent>
      </Dialog>
    </>
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
  const [expandedWallet, setExpandedWallet] = useState<string | null>(currentWallet?.name || null);

  if (!wallets) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Wallets & Addresses</h3>
      <ScrollArea className="h-64">
        <div className="space-y-1">
          {wallets.map((wallet) => (
            <WalletAccordionItem
              key={wallet.name}
              wallet={wallet}
              isCurrentWallet={wallet.name === currentWallet.name}
              isExpanded={expandedWallet === wallet.name}
              addresses={wallet.name === currentWallet.name ? addresses : []}
              currentAddress={currentAddress}
              onWalletChange={onWalletChange}
              onAddressChange={onAddressChange}
              onToggleExpand={(walletName) => {
                if (expandedWallet === walletName) {
                  setExpandedWallet(null);
                } else {
                  setExpandedWallet(walletName);
                  onWalletChange(walletName);
                }
              }}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface WalletAccordionItemProps {
  wallet: any;
  isCurrentWallet: boolean;
  isExpanded: boolean;
  addresses: [string, Address][];
  currentAddress: string;
  onWalletChange: (name: string) => void;
  onAddressChange: (path: string) => void;
  onToggleExpand: (walletName: string) => void;
}

function WalletAccordionItem({
  wallet,
  isCurrentWallet,
  isExpanded,
  addresses,
  currentAddress,
  onWalletChange,
  onAddressChange,
  onToggleExpand,
}: WalletAccordionItemProps) {
  const { data: walletAddresses } = useInvoke<[string, Address][]>(
    "wallets_get_wallet_addresses",
    { name: wallet.name },
    { enabled: isExpanded },
  );

  const addressesToShow = isCurrentWallet ? addresses : walletAddresses || [];

  return (
    <Collapsible open={isExpanded} onOpenChange={() => onToggleExpand(wallet.name)}>
      <CollapsibleTrigger asChild>
        <Button
          variant={isCurrentWallet ? "secondary" : "ghost"}
          className="w-full justify-start p-2 h-auto"
        >
          <div className="flex items-center gap-2 w-full">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 flex-shrink-0" />
            )}
            <WalletView name={wallet.name} type={wallet.type} />
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-6 space-y-1 mt-1">
          {addressesToShow.map(([path, address]) => (
            <Button
              key={path}
              variant={path === currentAddress ? "secondary" : "ghost"}
              className="w-full justify-start p-2 h-auto text-sm"
              onClick={() => onAddressChange(path)}
            >
              <AddressView icon contextMenu={false} address={address} />
            </Button>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function NetworkSection() {
  const [networks, currentNetwork, setCurrentNetwork] = useNetworks(
    useShallow((s) => [s.networks, s.current, s.setCurrent]),
  );

  if (!networks) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Networks</h3>
      <ScrollArea className="h-64">
        <div className="space-y-1">
          {networks.map((network) => (
            <Button
              key={network.name}
              variant={network.name === currentNetwork.name ? "secondary" : "ghost"}
              className="w-full justify-start p-2 h-auto"
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

function getCurrentAddress(wallet: any, addresses: [string, Address][]): string {
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