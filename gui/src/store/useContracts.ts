import type { Contract } from "@ethui/types";
import type { NetworkId } from "@ethui/types/network";
import { toast } from "@ethui/ui/hooks/use-toast";
import { event } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import type { Address } from "viem";
import { create, type StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { shortenProjectPath } from "#/utils";
import { useNetworks } from "./useNetworks";

interface Project {
  name: string;
  path: string;
  gitRoot?: string;
  addresses: Address[];
}

interface State {
  id?: NetworkId;
  contracts: OrganizedContract[];
  projects: Project[];
}

export type OrganizedContract = Contract & {
  alias?: string;
  proxyChain: Contract[];
  projectName?: string;
  projectPath?: string;
};

export interface ProjectGroup {
  projectName: string; // Display name ("Other Contracts" for null/undefined)
  projectPath: string | null; // Shortened path or null for "Other Contracts"
  gitRoot?: string; // Git root path if available
  contracts: OrganizedContract[];
}

interface Setters {
  reload: () => Promise<void>;
  add: (chainId: number, dedupId: number, address: Address) => Promise<void>;
  removeContract: (chainId: number, address: Address) => Promise<void>;
  setChainId: (id?: NetworkId) => void;
  filteredContracts: (filter: string) => OrganizedContract[];
  groupedContracts: (filter: string) => ProjectGroup[];
}

type Store = State & Setters;

const store: StateCreator<Store> = (set, get) => ({
  contracts: [],
  projects: [],

  async reload() {
    const { id } = get();
    if (!id) return;

    const is_anvil_network = await invoke<boolean>("networks_is_dev", {
      id,
    });

    // Fetch contracts and projects separately
    const [contracts, projects] = await Promise.all([
      invoke<Contract[]>("db_get_contracts", {
        chainId: id.chain_id,
        dedupId: is_anvil_network ? id.dedup_id : -1,
      }),
      invoke<Project[]>("sol_artifacts_get_projects", {
        chainId: id.chain_id,
        dedupId: is_anvil_network ? id.dedup_id : -1,
      }).catch(() => [] as Project[]),
    ]);
    // Map contracts to projects
    const contractsWithProjects = contracts.map((contract) => {
      const project = projects.find((p) =>
        p.addresses.some(
          (addr) => addr.toLowerCase() === contract.address.toLowerCase(),
        ),
      );

      return {
        ...contract,
        projectName: project?.name,
        projectPath: project?.path,
      };
    });

    set({
      contracts: await organizeContracts(contractsWithProjects),
      projects,
    });
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
      `${contract.address} ${contract.name} ${contract.alias} ${contract.projectName || ""}`
        .toLowerCase()
        .includes(lowerCaseFilter),
    );
  },

  groupedContracts(filter: string) {
    const filtered = get().filteredContracts(filter);
    const { projects } = get();

    // Group contracts by projectPath (unique) instead of projectName
    const groups = new Map<string, OrganizedContract[]>();

    for (const contract of filtered) {
      const key = contract.projectPath || "__other__";
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(contract);
    }

    // When no filter, include all projects (even empty ones)
    if (!filter) {
      for (const project of projects) {
        if (!groups.has(project.path)) {
          groups.set(project.path, []);
        }
      }
    }

    // Convert to ProjectGroup array
    const projectGroups: ProjectGroup[] = [];

    for (const [key, contracts] of groups.entries()) {
      if (key === "__other__") {
        // Handle "Other Contracts" - will be added last
        continue;
      }

      // Get project info from contracts or find in projects list
      const project = projects.find((p) => p.path === key);
      const projectName = contracts[0]?.projectName ||
        project?.name ||
        key.split('/').pop() || "Unknown";

      projectGroups.push({
        projectName,
        projectPath: shortenProjectPath(key),
        gitRoot: project?.gitRoot,
        contracts,
      });
    }

    // Sort: projects with contracts first (alphabetically), then empty projects (alphabetically)
    projectGroups.sort((a, b) => {
      const aHasContracts = a.contracts.length > 0;
      const bHasContracts = b.contracts.length > 0;

      if (aHasContracts && !bHasContracts) return -1;
      if (!aHasContracts && bHasContracts) return 1;
      return a.projectName.localeCompare(b.projectName);
    });

    // Add "Other Contracts" at the end if it exists
    if (groups.has("__other__")) {
      projectGroups.push({
        projectName: "Other Contracts",
        projectPath: null,
        contracts: groups.get("__other__")!,
      });
    }

    return projectGroups;
  },

  setChainId(id) {
    set({ id });
    get().reload();
  },
});

export const useContracts = create<Store>()(subscribeWithSelector(store));

event.listen("contracts-updated", async () => {
  await useContracts.getState().reload();
});

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
