import { MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { flatMap, map } from "lodash";
import React from "react";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import truncateEthAddress from "truncate-eth-address";

import { useAccount } from "../hooks";
import { useInvoke } from "../hooks/tauri";
import { Address, Wallet, Wallet2 } from "../types";

export function QuickAccountSelect() {
  const { data: wallets } = useInvoke<Wallet2[]>("wallets_get_all");
  const { mutate } = useSWRConfig();
  const { data: wallet } = useInvoke<Wallet2>("get_wallet");

  const [addresses, setAddresses] = useState<Address[]>([]);
  const current = useAccount();

  useEffect(() => {
    if (!wallet) return;

    (async () => {
      try {
        const addresses: Address[] = await invoke("derive_addresses", {});
        setAddresses(addresses);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [wallet]);

  const handleChange = (event: SelectChangeEvent<number>) => {
    const i = event.target.value as number;

    console.log(event);
    if (!wallet || wallet.idx == i) return;

    // (async () => {
    //   await invoke("set_wallet", {
    //     wallet: { ...wallet, idx: i },
    //   });
    //   mutate(() => true);
    // })();
  };

  if (!wallet || !current) return <>Loading</>;

  return (
    <Select
      size="small"
      renderValue={(value: number) =>
        addresses[value] && truncateEthAddress(addresses[value])
      }
      value={addresses.indexOf(current)}
      onChange={handleChange}
      label=""
    >
      {flatMap(wallets, (wallet) => (
        <ItemsFor wallet={wallet} />
      ))}
      <MenuItem value={1}>1</MenuItem>
      <MenuItem value={2}>2</MenuItem>
    </Select>
  );
}

const ItemsFor = ({ wallet }: { wallet: Wallet2 }) => {
  const { data: addresses } = useInvoke<Address[]>(`wallets_get_addresses`, {
    wallet: wallet.name,
  });
  console.log(addresses);

  return (
    <>
      {map(addresses, (address: string, key: number) => (
        <MenuItem value={JSON.stringify([wallet.name, key])} key={key}>
          {address}
        </MenuItem>
      ))}
    </>
  );
};
