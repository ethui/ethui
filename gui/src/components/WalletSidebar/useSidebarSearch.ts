import type { Network } from "@ethui/types/network";
import { useMemo } from "react";
import type { WalletInfo } from "#/store/useWallets";

interface SearchResult {
  wallets: WalletInfo[];
  networks: Network[];
}

export function useSidebarSearch(
  allWalletInfo: WalletInfo[] | undefined,
  networks: Network[] | undefined,
  searchTerm: string,
): SearchResult {
  return useMemo(() => {
    if (!searchTerm) {
      return {
        wallets: allWalletInfo || [],
        networks: networks || [],
      };
    }

    const filteredWallets = filterWalletsBySearch(
      allWalletInfo || [],
      searchTerm,
    );
    const filteredNetworks = filterNetworksBySearch(networks || [], searchTerm);

    return {
      wallets: filteredWallets,
      networks: filteredNetworks,
    };
  }, [allWalletInfo, networks, searchTerm]);
}

function filterWalletsBySearch(
  walletInfoList: WalletInfo[],
  searchFilter: string,
): WalletInfo[] {
  return walletInfoList
    .map((walletInfo) => {
      if (!searchFilter) {
        return walletInfo;
      }

      const walletNameMatches = walletInfo.wallet.name
        .toLowerCase()
        .includes(searchFilter.toLowerCase());
      if (walletNameMatches) {
        return walletInfo;
      }

      const filteredAddresses = walletInfo.addresses.filter((addressInfo) => {
        const addressMatches = addressInfo.address
          .toLowerCase()
          .includes(searchFilter.toLowerCase());
        const aliasMatches =
          addressInfo.alias &&
          addressInfo.alias.toLowerCase().includes(searchFilter.toLowerCase());
        return addressMatches || aliasMatches;
      });

      return {
        ...walletInfo,
        addresses: filteredAddresses,
      };
    })
    .filter((walletInfo) => walletInfo.addresses.length > 0);
}

function filterNetworksBySearch(
  networks: Network[],
  searchFilter: string,
): Network[] {
  if (!searchFilter) return networks;

  const searchTerm = searchFilter.toLowerCase();
  return networks.filter((network) =>
    network.name.toLowerCase().includes(searchTerm),
  );
}
