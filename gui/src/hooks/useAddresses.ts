import { invoke } from "@tauri-apps/api/tauri";
import { useEffect, useState } from "react";

import { Address, Wallet } from "../types";
import { useInvoke } from "./tauri";

export function useAddresses() {
  const { data: wallet } = useInvoke<Wallet>("get_wallet");
  const [addresses, setAddresses] = useState<Record<number, Address>>([]);

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

  return addresses;
}
