import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { flatMap, groupBy, keyBy, uniq } from "lodash-es";
import type { Address } from "viem";
import { useNetworks } from "#/store/useNetworks";
import { useWallets } from "#/store/useWallets";

export interface AddressData {
  address: string;
  alias?: string;
  wallet?: string;
}

interface CategorizedAddresses {
  all: AddressData[];
  eoas: AddressData[];
  contracts: AddressData[];
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

      const walletLookup = keyBy(
        flatMap(allWalletInfo || [], (info) =>
          info.addresses.map((addr) => ({
            address: addr.address.toLowerCase(),
            wallet: info.wallet.name,
          })),
        ),
        "address",
      );

      const walletAddresses = flatMap(allWalletInfo || [], (info) =>
        info.addresses.map((addr) => addr.address),
      );
      const allAddresses = uniq([
        ...walletAddresses,
        ...contractAddresses,
        ...transactionAddresses,
      ]);

      const knownContracts = new Set(
        contractAddresses.map((addr) => addr.toLowerCase()),
      );
      const unknownAddresses = transactionAddresses.filter(
        (addr) =>
          !walletAddresses.includes(addr) &&
          !knownContracts.has(addr.toLowerCase()),
      );

      const contractChecks = await Promise.allSettled(
        unknownAddresses.map((addr) =>
          invoke<boolean>("rpc_is_contract", {
            address: addr as Address,
            chainId,
          }),
        ),
      );

      contractChecks.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          knownContracts.add(unknownAddresses[index].toLowerCase());
        }
      });

      const aliasResults = await Promise.allSettled(
        allAddresses.map((address) =>
          invoke<string>("settings_get_alias", { address: address as Address }),
        ),
      );

      const addressData: AddressData[] = allAddresses.map((address, index) => ({
        address,
        alias:
          aliasResults[index].status === "fulfilled"
            ? aliasResults[index].value || undefined
            : undefined,
        wallet: walletLookup[address.toLowerCase()]?.wallet,
      }));

      const categorized = groupBy(addressData, (data) =>
        knownContracts.has(data.address.toLowerCase()) ? "contracts" : "eoas",
      );

      return {
        all: addressData,
        eoas: categorized.eoas || [],
        contracts: categorized.contracts || [],
      };
    },
    select: (data) => {
      if (!options.searchTerm) return data;

      const filterAddressData = (addressData: AddressData[]) =>
        addressData.filter(
          (data) =>
            data.address
              .toLowerCase()
              .includes(options.searchTerm!.toLowerCase()) ||
            data.alias
              ?.toLowerCase()
              .includes(options.searchTerm!.toLowerCase()) ||
            data.wallet
              ?.toLowerCase()
              .includes(options.searchTerm!.toLowerCase()),
        );

      return {
        all: filterAddressData(data.all),
        eoas: filterAddressData(data.eoas),
        contracts: filterAddressData(data.contracts),
      };
    },
    enabled:
      !!network && allWalletInfo !== undefined && options.enabled !== false,
  });
}
