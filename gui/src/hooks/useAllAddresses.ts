import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { Address } from "viem";
import { useNetworks } from "#/store/useNetworks";
import { useWallets } from "#/store/useWallets";

export function useAllAddresses() {
  const network = useNetworks((s) => s.current);
  const { allWalletInfo } = useWallets();

  return useQuery({
    queryKey: ["all-addresses", network?.id, allWalletInfo],
    queryFn: async (): Promise<Address[]> => {
      if (!network) return [];

      const chainId = network.id.chain_id;
      const dedupId = network.id.dedup_id;

      const [contractAddresses, transactionAddresses] = await Promise.all([
        invoke<Address[]>("db_get_contract_addresses", { chainId, dedupId }),
        invoke<Address[]>("db_get_transaction_addresses", { chainId }),
      ]);

      const walletAddresses = (allWalletInfo || []).flatMap((info) =>
        info.addresses.map((addr) => addr.address),
      );

      const allAddresses = new Set([
        ...walletAddresses,
        ...contractAddresses,
        ...transactionAddresses,
      ]);

      return Array.from(allAddresses);
    },
    enabled: !!network && allWalletInfo !== undefined,
  });
}
