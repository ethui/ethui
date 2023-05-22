import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

import { Address } from "../types";
import { useInvoke } from "./tauri";

export function useAccount() {
  const { data: address, mutate } = useInvoke<Address>(
    "wallets_get_current_address"
  );

  useEffect(() => {
    const unlisten = listen("address-changed", () => {
      mutate();
    });

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [mutate]);

  return address;
}
