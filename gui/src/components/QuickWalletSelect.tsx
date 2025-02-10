import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ethui/ui/components/shadcn/select";
import { useShallow } from "zustand/shallow";

import { useWallets } from "#/store/useWallets";
import { WalletView } from "./WalletView";

export function QuickWalletSelect() {
  const [wallets, currentWallet, setCurrentWallet] = useWallets(
    useShallow((s) => [s.wallets, s.currentWallet, s.setCurrentWallet]),
  );

  const handleChange = (value: string) => {
    setCurrentWallet(value);
  };

  if (!wallets || !currentWallet) return <>Loading</>;

  return (
    <Select
      value={currentWallet.name}
      defaultValue={currentWallet.name}
      onValueChange={handleChange}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>

      <SelectContent>
        <SelectGroup>
          {wallets.map(({ name, type }) => (
            <SelectItem value={name} key={name}>
              <WalletView name={name} type={type} />
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
