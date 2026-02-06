import type { Contract } from "@ethui/types";
import type { NetworkId } from "@ethui/types/network";
import { toast } from "@ethui/ui/hooks/use-toast";
import { event } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import type { Address } from "viem";
import { create, type StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { useNetworks } from "./useNetworks";

interface State {
  id?: NetworkId;
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
  setChainId: (id?: NetworkId) => void;
  filteredContracts: (filter: string) => OrganizedContract[];
}

type Store = State & Setters;

const store: StateCreator<Store> = (set, get) => ({
  contracts: [],

  async reload() {
    const { id } = get();
    if (!id) return;

    const is_anvil_network = await invoke<boolean>("networks_is_dev", {
      id,
    });

    const contracts = await invoke<Contract[]>("db_get_contracts", {
      chainId: id.chain_id,
      dedupId: is_anvil_network ? id.dedup_id : -1,
    });

    set({ contracts: await organizeContracts(contracts) });
  },

  add: async (chainId: number, dedupId: number, address: Address) => {
    try {
      const id: NetworkId = {
        chain_id: chainId,
        dedup_id: dedupId,
      };

      const is_anvil_network = await invoke<boolean>("networks_is_dev", {
        id,
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
      const { id } = get();
      if (!id) return;

      const is_anvil_network = await invoke<boolean>("networks_is_dev", {
        id,
      });

      await invoke("remove_contract", {
        chainId: Number(chainId),
        dedupId: is_anvil_network ? Number(id.dedup_id) : -1,
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

  setChainId(id) {
    set({ id });
    get().reload();
  },
});

export const useContracts = create<Store>()(subscribeWithSelector(store));

const listenerUnsubscribers: Array<Promise<() => void>> = [];
const trackListener = (listener: Promise<() => void>) => {
  listenerUnsubscribers.push(listener);
};

const disposeListeners = () => {
  for (const listener of listenerUnsubscribers) {
    listener.then((unlisten) => unlisten()).catch(() => {});
  }
};

if (import.meta.hot) {
  import.meta.hot.dispose(disposeListeners);
}

trackListener(
  event.listen("contracts-updated", async () => {
    await useContracts.getState().reload();
  }),
);

useNetworks.subscribe(
  (s) => s.current?.id,
  (id) => useContracts.getState().setChainId(id),
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
