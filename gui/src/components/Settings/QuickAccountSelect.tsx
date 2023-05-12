import { invoke } from "@tauri-apps/api/tauri";
import React from "react";
import { useCallback, useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import truncateEthAddress from "truncate-eth-address";

import { useAccount } from "../../hooks";
import { useInvoke } from "../../hooks/tauri";
import { Address, Wallet } from "../../types";
import Dropdown from "../Base/Dropdown";

export function QuickAccountSelect() {
  const { mutate } = useSWRConfig();
  const { data: wallet } = useInvoke<Wallet>("get_wallet");
  console.log(wallet);

  const [addresses, setAddresses] = useState<Record<number, Address>>([]);
  const current = useAccount();

  useEffect(() => {
    if (!wallet) return;

    (async () => {
      try {
        const addresses = (await invoke("derive_addresses", {})) as Record<
          number,
          Address
        >;
        setAddresses(addresses);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [wallet]);

  const handleClick = useCallback(
    async (i: number) => {
      if (!wallet || wallet.idx == i) return;
      await invoke("set_wallet", {
        wallet: { ...wallet, idx: i },
      });
      mutate(() => true);
    },
    [wallet, mutate]
  );

  if (!wallet) return <>Loading</>;

  return (
    <Dropdown
      label={truncateEthAddress(current)}
      entries={addresses}
      onChange={(key) => handleClick(parseInt(key))}
    />
  );
}
