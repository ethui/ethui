import type { Contract, DedupChainId } from "@ethui/types";
import { toast } from "@ethui/ui/hooks/use-toast";
import { event } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import type { Address } from "viem";
import { create, type StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { useNetworks } from "./useNetworks";

interface State {
  dedupChainId?: DedupChainId;
  contracts: OrganizedContract[];
}

export type OrganizedContract = Contract & {
  alias?: string;
  proxyChain: Contract[];
};

interface Setters {
  reload: () => Promise<void>;
  add: (chainId: number, dedupId: number, address: Address) => Promise<void>;
  removeContract: (chainId: number, address: Address) => Promise<void>;
  setChainId: (dedupChainId?: DedupChainId) => void;
  filteredContracts: (filter: string) => OrganizedContract[];
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

    set({ contracts: await organizeContracts(contracts) });
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

async function organizeContracts(
  contracts: Contract[],
): Promise<OrganizedContract[]> {
  type NestedContract = Contract & { alias?: string; impl?: NestedContract };

  const withAliases: NestedContract[] = await Promise.all(
    contracts.map(async (c) => {
      const alias = await invoke<string | undefined>("settings_get_alias", {
        address: c.address,
      });
      return { ...c, alias };
    }),
  );

  const nodeMap = new Map<Address, NestedContract>();
  const tmp: NestedContract[] = [];

  for (const c of withAliases) {
    nodeMap.set(c.address, c);
  }

  for (const c of withAliases) {
    const node = nodeMap.get(c.address)!;
    if (c.proxiedBy) {
      nodeMap.get(c.proxiedBy)!.impl = node;
    } else {
      tmp.push(node);
    }
  }

  const flatten = (c: NestedContract | undefined): Contract[] => {
    if (!c) return [];
    const { impl, ...contract } = c;
    return [contract, ...flatten(impl)];
  };

  return tmp.map((c) => {
    return { ...c, proxyChain: flatten(c.impl) };
  });
}
