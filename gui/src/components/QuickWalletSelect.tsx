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

export function QuickWalletSelect() {
  const [wallets, currentWallet, setCurrentWallet] = useWallets(
    useShallow((s) => [s.wallets, s.currentWallet, s.setCurrentWallet]),
  );

  const handleChange = (value: string) => {
    setCurrentWallet(value);
  };

  if (!wallets || !currentWallet) return <>Loading</>;

  return (
    <Select defaultValue={currentWallet.name} onValueChange={handleChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>

      <SelectContent>
        <SelectGroup>
          {wallets.map(({ name }) => (
            <SelectItem value={name} key={name}>
              {name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
