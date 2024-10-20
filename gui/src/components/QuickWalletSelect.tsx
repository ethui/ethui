import {
  FormControl,
  InputLabel,
  MenuItem,
  //Select,
  type SelectChangeEvent,
} from "@mui/material";
import { useShallow } from "zustand/shallow";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ethui/ui/components/ui/select";

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
      <SelectTrigger className="w-[180px]">
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
//<FormControl variant="standard" fullWidth>
//  <InputLabel id="wallet-select-label">Wallet</InputLabel>
//  <Select
//    label="Wallet"
//    labelId="wallet-select-label"
//    onChange={handleChange}
//    size="small"
//    value={currentWallet.name}
//  >
//    {wallets.map(({ name }) => (
//      <MenuItem value={name} key={name}>
//        {name}
//      </MenuItem>
//    ))}
//  </Select>
//</FormControl>
}
