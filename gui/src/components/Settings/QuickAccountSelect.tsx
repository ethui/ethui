import { invoke } from "@tauri-apps/api/tauri";
import { useCallback, useEffect, useState } from "react";
import truncateEthAddress from "truncate-eth-address";

import { useInvoke } from "../../hooks/tauri";
import { Address, Wallet } from "../../types";
import Dropdown from "../Base/Dropdown";

export function QuickAccountSelect() {
  const { data: wallet, mutate } = useInvoke<Wallet>("get_wallet");

  const [addresses, setAddresses] = useState<Record<number, Address>>([]);
  const [current, setCurrent] = useState<Address>("0x");

  useEffect(() => {
    if (!wallet) return;

    (async () => {
      try {
        const addresses = (await invoke("derive_addresses", {})) as Record<
          number,
          Address
        >;
        setAddresses(addresses);
        setCurrent(addresses[wallet.idx]);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [wallet]);

  const handleClick = useCallback(
    async (i: number) => {
      if (!wallet || wallet.idx == i) return;
      console.log(wallet);
      await invoke("set_wallet", {
        wallet: { ...wallet, idx: i },
      });
      mutate();
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
