import { invoke } from "@tauri-apps/api/tauri";
import { Address } from "viem";
import { StateCreator, create } from "zustand";

interface Store {
  data: Record<number, Array<Address>>;

  init: () => void;
  addAddress: (chainId: number, address: Address) => void;
}

interface IContract {
  address: Address;
  deployedCodeHash: string;
}

const store: StateCreator<Store> = (set, get) => ({
  data: {},

  init: async () => {
    const contracts = await invoke<IContract[]>("db_get_contracts", {
      chainId: 31337,
    });
    set({
      data: {
        31337: contracts.map(({ address }) => address),
      },
    });
  },

  addAddress: (chainId: number, address: Address) =>
    set(({ data }) => {
      if (!data[chainId]) {
        data[chainId] = [];
      }

      data[chainId].push(address);

      return { data };
    }),
});

export const useContracts = create<Store>()(store);

(async () => {
  await useContracts.getState().init();
})();
