import { MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { map } from "lodash";
import React from "react";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import truncateEthAddress from "truncate-eth-address";

import { useAccount } from "../hooks";
import { useInvoke } from "../hooks/tauri";
import { Address, Wallet } from "../types";

export function QuickAccountSelect() {
  const { mutate } = useSWRConfig();
  const { data: wallet } = useInvoke<Wallet>("get_wallet");

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

    if (!wallet || wallet.idx == i) return;

    (async () => {
      await invoke("set_wallet", {
        wallet: { ...wallet, idx: i },
      });
      mutate(() => true);
    })();
  };

  if (!wallet || !current) return <>Loading</>;

  return (
    <Select
      renderValue={(value: number) =>
        addresses[value] && truncateEthAddress(addresses[value])
      }
      value={addresses.indexOf(current)}
      onChange={handleChange}
      label=""
    >
      {map(addresses, (address: string, key: number) => (
        <MenuItem value={key} key={key}>
          {address}
        </MenuItem>
      ))}
    </Select>
  );
}
