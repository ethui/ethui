import { invoke } from "@tauri-apps/api/tauri";
import { Dropdown } from "flowbite-react";
import { useCallback, useEffect, useState } from "react";
import truncateEthAddress from "truncate-eth-address";

import { useInvoke } from "../../hooks/tauri";
import { Address, Wallet } from "../../types";
import { deriveFiveAddresses } from "../../utils/address";

export function QuickAccountSelect() {
  const { data: wallet, mutate } = useInvoke<Wallet>("get_wallet");

  const [addresses, setAddresses] = useState<Record<number, Address>>([]);
  const [current, setCurrent] = useState<Address>("0x");

  useEffect(() => {
    if (!wallet) return;

    const addresses = deriveFiveAddresses(
      wallet.mnemonic,
      wallet.derivationPath
    );
    setAddresses(addresses);
    setCurrent(addresses[wallet.idx]);
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
    <Dropdown label={truncateEthAddress(current)}>
      {Object.entries(addresses).map(([i, address]) => (
        <Dropdown.Item key={i} onClick={() => handleClick(parseInt(i))}>
          {address}
        </Dropdown.Item>
      ))}
    </Dropdown>
  );
}
