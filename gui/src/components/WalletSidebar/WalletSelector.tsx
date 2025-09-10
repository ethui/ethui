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
import { useState } from "react";
import { useShallow } from "zustand/shallow";
import {
  type AddressInfo,
  useWallets,
  type WalletInfo,
} from "#/store/useWallets";
import { AddressView } from "../AddressView";
import { WalletView } from "../WalletView";

interface WalletSelectorProps {
  wallets: WalletInfo[];
}

export function WalletSelector({ wallets }: WalletSelectorProps) {
  const [currentWallet, setCurrentWallet, setCurrentAddress] = useWallets(
    useShallow((s) => [
      s.currentWallet,
      s.setCurrentWallet,
      s.setCurrentAddress,
    ]),
  );
  const [expandedWallet, setExpandedWallet] = useState<string>(
    currentWallet?.name || "",
  );

  function handleWalletAddressSelect(walletName: string, addressPath: string) {
    setCurrentWallet(walletName);
    setCurrentAddress(addressPath);
  }

  if (!currentWallet) {
    return null;
  }

  return (
    <>
      {wallets.length > 0 && (
        <div>
          <h3 className="p-2 font-medium text-muted-foreground text-sm">
            Wallets & Accounts
          </h3>
          <ScrollArea className="max-h-96">
            <Accordion
              type="single"
              value={expandedWallet}
              onValueChange={(value) => setExpandedWallet(value || "")}
              collapsible
            >
              {wallets.map((walletInfo) => (
                <WalletAccordionItem
                  key={walletInfo.wallet.name}
                  walletInfo={walletInfo}
                  isCurrentWallet={
                    walletInfo.wallet.name === currentWallet.name
                  }
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
      )}
    </>
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
      <AccordionTrigger className="h-auto w-full cursor-pointer justify-start bg-secondary px-2 py-2 text-sm hover:no-underline">
        <div className="flex w-full items-center gap-2">
          <WalletView name={wallet.name} type={wallet.type} />
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-0 py-2">
        {addresses.map((addressInfo) => (
          <Button
            key={addressInfo.key}
            variant={"ghost"}
            className="relative flex h-auto w-full items-center justify-between p-0"
            onClick={() => onSelect(wallet.name, addressInfo.key)}
          >
            <AddressView
              showLinkExplorer={false}
              noTextStyle
              clickToCopy={false}
              icon
              address={addressInfo.address}
              className="w-full py-2 pr-2 pl-4"
            />
            {isCurrentWallet && addressInfo.key === currentAddress && (
              <Check className="absolute right-2" color="green" />
            )}
          </Button>
        ))}
      </AccordionContent>
    </AccordionItem>
  );
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
