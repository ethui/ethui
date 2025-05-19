import { create } from "zustand";

interface AbiStore {
  abis: Record<string, any>;
  selectors: Record<string, string[]>;
  signatures: Record<string, string[]>;
  selectorsMap: Record<string, string>;
  setAbiData: (data: Record<string, any>) => void;
}

export const useAbiStore = create<AbiStore>((set) => ({
  abis: {},
  selectors: {},
  signatures: {},
  selectorsMap: {},
  setAbiData: (data) =>
    set({
      abis: data.abiCollection,
      selectors: data.selectors,
      signatures: data.signatures,
      selectorsMap: data.selectorsMap,
    }),
}));
