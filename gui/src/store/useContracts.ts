import { event } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import type { Address } from "viem";
import { type StateCreator, create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import type { Contract, DedupChainId } from "@ethui/types";
import { toast } from "@ethui/ui/hooks/use-toast";
import { useNetworks } from "./useNetworks";

interface State {
  dedupChainId?: DedupChainId;
  contracts: Contract[];
}

interface Setters {
  reload: () => Promise<void>;
  add: (chainId: number, dedupId: number, address: Address) => Promise<void>;
  removeContract: (chainId: number, address: Address) => Promise<void>;
  setChainId: (dedupChainId?: DedupChainId) => void;
  filteredContracts: (filter: string) => Contract[];
}

type Store = State & Setters;

const store: StateCreator<Store> = (set, get) => ({
  contracts: [],

  async reload() {
    const { dedupChainId } = get();
    if (!dedupChainId) return;

    const is_anvil_network = await invoke<boolean>("networks_is_dev", {
      dedupChainId,
    });

    const contracts = await invoke<Contract[]>("db_get_contracts", {
      chainId: dedupChainId.chain_id,
      dedupId: is_anvil_network ? dedupChainId.dedup_id : -1,
    });

    const contractsWithAlias = await Promise.all(
      contracts.map(async (c) => {
        const alias = await invoke<string | undefined>("settings_get_alias", {
          address: c.address,
        });
        return { ...c, alias };
      }),
    );

    const filteredContractsAndProxiesWithAlias = contractsWithAlias.reduce(
      (acc: Contract[], c: Contract) => {
        if (c.proxiedBy) {
          const proxyName = contractsWithAlias.find(
            (e) => e.proxyFor === c.address,
          )?.name;
          acc.push({ ...c, proxyName });
        } else if (!c.proxyFor) {
          acc.push(c);
        }
        return acc;
      },
      [],
    );

    set({ contracts: filteredContractsAndProxiesWithAlias });
  },

  add: async (chainId: number, dedupId: number, address: Address) => {
    try {
      const dedupChainId: DedupChainId = {
        chain_id: chainId,
        dedup_id: dedupId,
      };

      const is_anvil_network = await invoke<boolean>("networks_is_dev", {
        dedupChainId,
      });

      await invoke("add_contract", {
        chainId: Number(chainId),
        dedupId: is_anvil_network ? Number(dedupId) : -1,
        address,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.toString(),
        variant: "destructive",
      });
    }
  },

  removeContract: async (chainId: number, address: Address) => {
    try {
      const { dedupChainId } = get();
      if (!dedupChainId) return;

      const is_anvil_network = await invoke<boolean>("networks_is_dev", {
        dedupChainId,
      });

      await invoke("remove_contract", {
        chainId: Number(chainId),
        dedupId: is_anvil_network ? Number(dedupChainId.dedup_id) : -1,
        address,
      });

      toast({
        title: "Deleted",
        description: "Contract removed",
        variant: "destructive",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.toString(),
        variant: "destructive",
      });
    }
  },

  filteredContracts(filter: string) {
    const lowerCaseFilter = filter.toLowerCase();
    const { contracts } = get();

    if (lowerCaseFilter === "") return contracts;
    return contracts.filter((contract) =>
      `${contract.address} ${contract.name} ${contract.alias}`
        .toLowerCase()
        .includes(lowerCaseFilter),
    );
  },

  setChainId(dedupChainId) {
    set({ dedupChainId });
    get().reload();
  },
});

export const useContracts = create<Store>()(subscribeWithSelector(store));

event.listen("contracts-updated", async () => {
  await useContracts.getState().reload();
});

useNetworks.subscribe(
  (s) => s.current?.dedup_chain_id,
  (dedupChainId) => useContracts.getState().setChainId(dedupChainId),
  { fireImmediately: true },
);
