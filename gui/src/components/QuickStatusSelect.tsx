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