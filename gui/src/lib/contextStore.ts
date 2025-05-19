import { create } from "zustand";

interface ContextStore {
  isCastTrace: boolean;
  aliasList: {
    [x: string]: string;
  };
  filteredMethods: {
    [x: string]: boolean;
  };
  filteredContracts: {
    [x: string]: boolean;
  };
  highlightedMethods: {
    [x: string]: boolean;
  };
  highlightedContracts: {
    [x: string]: boolean;
  };

  setContext: (prefs: Partial<ContextStore>) => void;
  resetContext: () => void;
  addAlias: (address: string, alias: string) => void;
  mergeAliasList: (newAliasList: Record<string, string>) => void;
  addSelectorToFiltered: (selector: string) => void;
  addSelectorToHighLighted: (selector: string) => void;
  addContractToFiltered: (contract: string) => void;
  addContractToHighLighted: (contract: string) => void;
}

export const useContextStore = create<ContextStore>((set) => ({
  isCastTrace: false,
  aliasList: {
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266": "anvil#01",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8": "anvil#02",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC": "anvil#03",
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906": "anvil#04",
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65": "anvil#05",
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc": "anvil#06",
    "0x976EA74026E726554dB657fA54763abd0C3a0aa9": "anvil#07",
    "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955": "anvil#08",
    "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f": "anvil#09",
    "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720": "anvil#10",
  },
  filteredMethods: {},
  filteredContracts: {},
  highlightedMethods: {},
  highlightedContracts: {},

  setContext: (prefs) =>
    set((state) => ({
      ...state,
      ...prefs,
    })),

  resetContext: () =>
    set({
      isCastTrace: false,
    }),

  addAlias: (address, alias) =>
    set((state) => ({
      aliasList: {
        ...state.aliasList,
        [address]: alias,
      },
    })),

  mergeAliasList: (newAliasList: Record<string, string>) =>
    set((state) => ({
      aliasList: {
        ...state.aliasList,
        ...newAliasList,
      },
    })),

  addSelectorToFiltered: (selector) =>
    set((state) => ({
      filteredMethods: {
        ...state.filteredMethods,
        [selector]: true,
      },
    })),

  addSelectorToHighLighted: (selector) =>
    set((state) => ({
      highlightedMethods: {
        ...state.highlightedMethods,
        [selector]: true,
      },
    })),

  addContractToFiltered: (contract) =>
    set((state) => ({
      filteredContracts: {
        ...state.filteredContracts,
        [contract]: true,
      },
    })),

  addContractToHighLighted: (contract) =>
    set((state) => ({
      highlightedContracts: {
        ...state.highlightedContracts,
        [contract]: true,
      },
    })),
}));
