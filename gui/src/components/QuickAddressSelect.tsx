import type { Wallet } from "@ethui/types/wallets";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ethui/ui/components/shadcn/select";
import { map } from "lodash-es";
import { type Address, getAddress } from "viem";
import { useShallow } from "zustand/shallow";
import { useInvoke } from "#/hooks/useInvoke";
import { useWallets } from "#/store/useWallets";
import { AddressView } from "./AddressView";

export function QuickAddressSelect() {
  const [currentWallet, setCurrentAddress] = useWallets(
    useShallow((s) => [s.currentWallet, s.setCurrentAddress]),
  );
  const { data: addresses } = useInvoke<[string, Address][]>(
    "wallets_get_wallet_addresses",
    { name: currentWallet?.name },
  );

  if (!addresses || !currentWallet) return <>Loading</>;

  return (
    <Select
      key={getCurrentPath(currentWallet, addresses)}
      defaultValue={getCurrentPath(currentWallet, addresses)}
      onValueChange={setCurrentAddress}
    >
      <SelectTrigger className="cursor-pointer">
        <SelectValue />
      </SelectTrigger>

      <SelectContent>
        <SelectGroup>
          {map(addresses, ([key, address]) => (
            <SelectItem value={key} key={key}>
              <AddressView icon contextMenu={false} address={address} />
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function getCurrentPath(wallet: Wallet, addresses: [string, Address][]) {
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
  }
}
