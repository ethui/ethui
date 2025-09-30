import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { Address } from "viem";
import { useNetworks } from "#/store/useNetworks";
import { useWallets } from "#/store/useWallets";

interface CategorizedAddresses {
  all: Address[];
  eoas: Address[];
  contracts: Address[];
}

export function useAllAddresses(
  options: { enabled?: boolean; searchTerm?: string } = {},
) {
  const network = useNetworks((s) => s.current);
  const { allWalletInfo } = useWallets();

  return useQuery({
    queryKey: ["all-addresses", network?.id, allWalletInfo],
    queryFn: async (): Promise<CategorizedAddresses> => {
      if (!network) return { all: [], eoas: [], contracts: [] };

      const chainId = network.id.chain_id;
      const dedupId = network.id.dedup_id;

      const [contractAddresses, transactionAddresses] = await Promise.all([
        invoke<Address[]>("db_get_contract_addresses", { chainId, dedupId }),
        invoke<Address[]>("db_get_transaction_addresses", { chainId }),
      ]);

      const walletAddresses = (allWalletInfo || []).flatMap((info) =>
        info.addresses.map((addr) => addr.address),
      );

      const allAddresses = Array.from(
        new Set([
          ...walletAddresses,
          ...contractAddresses,
          ...transactionAddresses,
        ]),
      );

      const knownEOAs = new Set(walletAddresses);

      const knownContracts = new Set(contractAddresses);

      const unknownAddresses = transactionAddresses.filter(
        (addr) => !knownEOAs.has(addr) && !knownContracts.has(addr),
      );

      await Promise.all(
        unknownAddresses.map(async (address) => {
          try {
            const isContract = await invoke<boolean>("rpc_is_contract", {
              address,
              chainId,
            });
            if (isContract) {
              knownContracts.add(address);
            } else {
              knownEOAs.add(address);
            }
          } catch {
            knownEOAs.add(address);
          }
        }),
      );

      return {
        all: allAddresses,
        eoas: Array.from(knownEOAs),
        contracts: Array.from(knownContracts),
      };
    },
    select: (data) => {
      if (!options.searchTerm) return data;

      const filterAddresses = (addresses: Address[]) =>
        addresses.filter((address) =>
          address.toLowerCase().includes(options.searchTerm!.toLowerCase()),
        );

      return {
        all: filterAddresses(data.all),
        eoas: filterAddresses(data.eoas),
        contracts: filterAddresses(data.contracts),
      };
    },
    enabled:
      !!network && allWalletInfo !== undefined && options.enabled !== false,
  });
}
