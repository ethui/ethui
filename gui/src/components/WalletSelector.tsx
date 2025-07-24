import type { Wallet } from "@ethui/types/wallets";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@ethui/ui/components/shadcn/accordion";
import { Button } from "@ethui/ui/components/shadcn/button";
import { ScrollArea } from "@ethui/ui/components/shadcn/scroll-area";
import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import {
  type AddressInfo,
  useWallets,
  type WalletInfo,
} from "#/store/useWallets";
import { AddressView } from "./AddressView";
import { SearchInput } from "./SearchInput";
import { WalletView } from "./WalletView";

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
    return filterWalletsBySearch(allWalletInfo, walletFilter);
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
      <h3 className="pl-3 font-medium text-muted-foreground text-sm">
        Wallets & Accounts
      </h3>
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
            />
          ))}
        </Accordion>
      </ScrollArea>
    </div>
  );
}

interface WalletAccordionItemProps {
  walletInfo: WalletInfo;
  isCurrentWallet: boolean;
  currentAddress: string;
  onSelect: (walletName: string, addressPath: string) => void;
}

function WalletAccordionItem({
  walletInfo,
  isCurrentWallet,
  currentAddress,
  onSelect,
}: WalletAccordionItemProps) {
  const wallet = walletInfo.wallet;
  const addresses = walletInfo.addresses;

  return (
    <AccordionItem value={wallet.name}>
      <AccordionTrigger className="h-auto w-full cursor-pointer justify-start bg-secondary px-3 py-2 text-sm hover:no-underline">
        <div className="flex w-full items-center gap-2">
          <WalletView name={wallet.name} type={wallet.type} />
        </div>
      </AccordionTrigger>
      <AccordionContent className="p-0">
        <div className="ml-2 space-y-0">
          {addresses.map((addressInfo) => (
            <Button
              key={addressInfo.key}
              variant={"ghost"}
              className="flex h-auto w-full items-center justify-between gap-2 p-2"
              onClick={() => onSelect(wallet.name, addressInfo.key)}
            >
              <AddressView
                className="gap-2 text-sm"
                iconClassName="!h-5 !w-5"
                clickToCopy={false}
                icon
                contextMenu={false}
                address={addressInfo.address}
              />
              {isCurrentWallet && addressInfo.key === currentAddress && (
                <Check className="h-4 w-4" color="green" />
              )}
            </Button>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function filterWalletsBySearch(
  walletInfoList: WalletInfo[],
  searchFilter: string,
): WalletInfo[] {
  return walletInfoList
    .map((walletInfo) => {
      if (!searchFilter) {
        return walletInfo;
      }

      const walletNameMatches = walletInfo.wallet.name
        .toLowerCase()
        .includes(searchFilter.toLowerCase());
      if (walletNameMatches) {
        return walletInfo;
      }

      const filteredAddresses = walletInfo.addresses.filter((addressInfo) => {
        const addressMatches = addressInfo.address
          .toLowerCase()
          .includes(searchFilter.toLowerCase());
        const aliasMatches =
          addressInfo.alias &&
          addressInfo.alias.toLowerCase().includes(searchFilter.toLowerCase());
        return addressMatches || aliasMatches;
      });

      return {
        ...walletInfo,
        addresses: filteredAddresses,
      };
    })
    .filter((walletInfo) => walletInfo.addresses.length > 0);
}

function getCurrentAddress(wallet: Wallet, addresses: AddressInfo[]): string {
  switch (wallet.type) {
    case "HDWallet":
      return wallet.current ? wallet.current[0] : addresses[0]?.key || "";
    case "impersonator":
      return (wallet.current || 0).toString();
    case "jsonKeystore":
    case "plaintext":
      return wallet.currentPath || "";
    case "ledger":
      return wallet.addresses[wallet.current || 0][0];
    case "privateKey":
      return wallet.address;
    default:
      return addresses[0]?.key || "";
  }
}
