import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import { StateCreator, create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { Address, NftToken } from "../types";
import { useNetworks } from "./networks";
import { useWallets } from "./wallets";

interface State {
  erc721Tokens: NftToken[];
  address?: Address;
  chainId?: number;
  interval?: NodeJS.Timer;
}

interface Setters {
  reload: () => Promise<void>;
  setAddress: (address?: Address) => void;
  setChainId: (chainId?: number) => void;
}

type Store = State & Setters;

const oneMinute = 60 * 1000;

const store: StateCreator<Store> = (set, get) => ({
  erc721Tokens: [],
  shouldPoll: true,

  async reload() {
    const { address, chainId } = get();
    if (!address || !chainId) return;

    const [erc721Tokens] = await Promise.all([
      invoke<NftToken[]>("db_get_erc721_tokens", { chainId }),
    ]);
 
    set({erc721Tokens});
  },

  setAddress(address) {
    set({ address });
    get().reload();
  },

  setChainId(chainId) {
    set({ chainId });
    get().reload();
  },
});

export const useErc721 = create<Store>()(subscribeWithSelector(store));

(async () => {
  const interval = setInterval(async () => { await useErc721.getState().reload(); }, oneMinute);

  useWallets.subscribe(
    (s) => s.address,
    (address?: Address) => useErc721.getState().setAddress(address),
    { fireImmediately: true }
  );

  useNetworks.subscribe(
    (s) => s.current?.chain_id,
    (chainId) => useErc721.getState().setChainId(chainId),
    { fireImmediately: true }
  );

  return () => clearInterval(interval);
})();
