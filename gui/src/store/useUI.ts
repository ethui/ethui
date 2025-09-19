import { create } from "zustand";

interface UIState {
  searchBar: boolean;
  walletSidebar: boolean;
  setSearchBar: (open: boolean) => void;
  setWalletSidebar: (open: boolean) => void;
  toggleSearchBar: () => void;
  toggleWalletSidebar: () => void;
  closeAll: () => void;
}

export const useUI = create<UIState>((set) => ({
  searchBar: false,
  walletSidebar: false,
  setSearchBar: (open) => set({ searchBar: open }),
  setWalletSidebar: (open) => set({ walletSidebar: open }),
  toggleSearchBar: () => set((state) => ({ searchBar: !state.searchBar })),
  toggleWalletSidebar: () =>
    set((state) => ({ walletSidebar: !state.walletSidebar })),
  closeAll: () => set({ searchBar: false, walletSidebar: false }),
}));
