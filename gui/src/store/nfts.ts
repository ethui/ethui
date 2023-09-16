import { invoke } from "@tauri-apps/api/tauri";
import { StateCreator, create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { Address, Nft } from "../types";
import { useNetworks } from "./networks";
import { useWallets } from "./wallets";
import { listen } from "@tauri-apps/api/event";

interface State {
  nfts: Nft[];
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
  nfts: [],
  shouldPoll: true,

  async reload() {
    const { address, chainId } = get();
    if (!address || !chainId) return;

    const [nfts] = await Promise.all([
      invoke<Nft[]>("db_get_erc721_tokens", { chainId, owner: address }),
    ]);

    set({ nfts });
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

export const useNfts = create<Store>()(subscribeWithSelector(store));

listen("erc721-updated", async () => {
  await useNfts.getState().reload();
});

(async () => {
  const interval = setInterval(async () => {
    await useNfts.getState().reload();
  }, oneMinute);

  useWallets.subscribe(
    (s) => s.address,
    (address?: Address) => useNfts.getState().setAddress(address),
    { fireImmediately: true }
  );

  useNetworks.subscribe(
    (s) => s.current?.chain_id,
    (chainId) => useNfts.getState().setChainId(chainId),
    { fireImmediately: true }
  );

  return () => clearInterval(interval);
})();
