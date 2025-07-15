import { ChainView } from "@ethui/ui/components/chain-view";
import { Wallet } from "lucide-react";
import { type Address, getAddress } from "viem";
import { useShallow } from "zustand/shallow";
import { useInvoke } from "#/hooks/useInvoke";
import { useNetworks } from "#/store/useNetworks";
import { useWallets } from "#/store/useWallets";
import { AddressView } from "./AddressView";

export function QuickStatusSelect() {
  const [currentWallet] = useWallets(useShallow((s) => [s.currentWallet]));
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
    <div className="flex flex-col gap-1 p-2 border rounded-md">
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

  if (!wallets) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Wallets & Addresses</h3>
      <ScrollArea className="h-48">
        <div className="space-y-2">
          {wallets.map((wallet) => (
            <WalletGroup
              key={wallet.name}
              wallet={wallet}
              isCurrentWallet={wallet.name === currentWallet.name}
              addresses={wallet.name === currentWallet.name ? addresses : []}
              currentAddress={currentAddress}
              onWalletChange={onWalletChange}
              onAddressChange={onAddressChange}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface WalletGroupProps {
  wallet: any;
  isCurrentWallet: boolean;
  addresses: [string, Address][];
  currentAddress: string;
  onWalletChange: (name: string) => void;
  onAddressChange: (path: string) => void;
}

function WalletGroup({
  wallet,
  isCurrentWallet,
  addresses,
  currentAddress,
  onWalletChange,
  onAddressChange,
}: WalletGroupProps) {
  const { data: walletAddresses } = useInvoke<[string, Address][]>(
    "wallets_get_wallet_addresses",
    { name: wallet.name },
    { enabled: isCurrentWallet },
  );

  const addressesToShow = isCurrentWallet ? addresses : walletAddresses || [];

  return (
    <div className="space-y-1">
      <Button
        variant={isCurrentWallet ? "secondary" : "ghost"}
        className="w-full justify-start p-2 h-auto"
        onClick={() => onWalletChange(wallet.name)}
      >
        <WalletView name={wallet.name} type={wallet.type} />
      </Button>
      {isCurrentWallet && addressesToShow.length > 0 && (
        <div className="ml-4 space-y-1">
          {map(addressesToShow, ([path, address]) => (
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
      )}
    </div>
  );
}

interface NetworkSectionProps {
  networks: any[];
  currentNetwork: any;
  onNetworkChange: (name: string) => void;
}

function NetworkSection({
  networks,
  currentNetwork,
  onNetworkChange,
}: NetworkSectionProps) {
  if (!networks) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Networks</h3>
      <ScrollArea className="h-32">
        <div className="space-y-1">
          {networks.map((network) => (
            <Button
              key={network.name}
              variant={network.name === currentNetwork.name ? "secondary" : "ghost"}
              className="w-full justify-start p-2 h-auto"
              onClick={() => onNetworkChange(network.name)}
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