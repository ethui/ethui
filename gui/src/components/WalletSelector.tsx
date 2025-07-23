import { useState, useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { ScrollArea } from "@ethui/ui/components/shadcn/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@ethui/ui/components/shadcn/accordion";
import { Button } from "@ethui/ui/components/shadcn/button";
import { useWallets } from "#/store/useWallets";
import { AddressView } from "./AddressView";
import { WalletView } from "./WalletView";
import { SearchInput } from "./SearchInput";

export function WalletSelector() {
  const [
    wallets,
    currentWallet,
    allWalletInfo,
    setCurrentWallet,
    setCurrentAddress,
  ] = useWallets(
    useShallow((s) => [
      s.wallets,
      s.currentWallet,
      s.allWalletInfo,
      s.setCurrentWallet,
      s.setCurrentAddress,
    ]),
  );
  const [expandedWallet, setExpandedWallet] = useState<string>(
    currentWallet?.name || "",
  );
  const [walletFilter, setWalletFilter] = useState("");

  const filteredWallets = useMemo(() => {
    if (!allWalletInfo) return [];

    return allWalletInfo.filter((walletInfo) => {
      const nameMatch = walletInfo.wallet.name
        .toLowerCase()
        .includes(walletFilter.toLowerCase());

      if (!walletFilter) return true;

      const addressMatch = walletInfo.addresses.some((addressInfo: any) => {
        const addressMatches = addressInfo.address
          .toLowerCase()
          .includes(walletFilter.toLowerCase());
        const aliasMatches =
          addressInfo.alias &&
          addressInfo.alias.toLowerCase().includes(walletFilter.toLowerCase());
        return addressMatches || aliasMatches;
      });

      return nameMatch || addressMatch;
    });
  }, [allWalletInfo, walletFilter]);

  function handleWalletAddressSelect(walletName: string, addressPath: string) {
    setCurrentWallet(walletName);
    setCurrentAddress(addressPath);
  }

  if (!wallets || !currentWallet || !allWalletInfo) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Wallet</h3>
      <SearchInput
        value={walletFilter}
        onChange={setWalletFilter}
        placeholder="Filter"
      />
      <ScrollArea className="max-h-96">
        <Accordion
          type="single"
          value={expandedWallet}
          onValueChange={(value) => setExpandedWallet(value || "")}
          collapsible
        >
          {filteredWallets.map((walletInfo) => (
            <WalletAccordionItem
              key={walletInfo.wallet.name}
              walletInfo={walletInfo}
              isCurrentWallet={walletInfo.wallet.name === currentWallet.name}
              currentAddress={getCurrentAddress(
                currentWallet,
                walletInfo.addresses,
              )}
              onSelect={handleWalletAddressSelect}
              filter={walletFilter}
            />
          ))}
        </Accordion>
      </ScrollArea>
    </div>
  );
}

interface WalletAccordionItemProps {
  walletInfo: any;
  isCurrentWallet: boolean;
  currentAddress: string;
  onSelect: (walletName: string, addressPath: string) => void;
  filter: string;
}

function WalletAccordionItem({
  walletInfo,
  isCurrentWallet,
  currentAddress,
  onSelect,
  filter,
}: WalletAccordionItemProps) {
  const wallet = walletInfo.wallet;
  const addresses = walletInfo.addresses;

  const filteredAddresses = addresses.filter((addressInfo: any) => {
    if (!filter) return true;
    return addressInfo.address.toLowerCase().includes(filter.toLowerCase());
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
          {filteredAddresses.map((addressInfo: any) => (
            <Button
              key={addressInfo.key}
              variant={
                isCurrentWallet && addressInfo.key === currentAddress
                  ? "secondary"
                  : "ghost"
              }
              className="w-full justify-start p-1 h-auto text-xs"
              onClick={() => onSelect(wallet.name, addressInfo.key)}
            >
              <AddressView
                icon
                contextMenu={false}
                address={addressInfo.address}
              />
            </Button>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function getCurrentAddress(wallet: any, addresses: any[]): string {
  switch (wallet.type) {
    case "HDWallet":
      return wallet.current ? wallet.current[0] : addresses[0]?.key || "";
    case "impersonator":
      return (wallet.current || 0).toString();
    case "jsonKeystore":
    case "plaintext":
      return wallet.currentPath;
    case "ledger":
      return wallet.addresses[wallet.current || 0][0];
    case "privateKey":
      return wallet.address;
    default:
      return addresses[0]?.key || "";
  }
}
