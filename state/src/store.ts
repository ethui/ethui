import * as Constants from "@iron/constants";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { storageWrapper } from "./storageWrapper";

type Address = `0x${string}`;

interface Settings {
  mnemonic: string;
  rpc: string;
  address: Address;
}

interface Setters {
  setMnemonic: (settings: Pick<Settings, "mnemonic">) => void;
  setRpc: (settings: Pick<Settings, "rpc">) => void;
}

type State = Settings & Setters;

export const useStore = create<State>()(
  persist(
    (set, _get) => ({
      mnemonic: Constants.wallet.mnemonic,
      rpc: Constants.network.rpc,
      address: derive(
        Constants.wallet.mnemonic,
        Constants.wallet.path,
        Constants.wallet.index
      ),
      setMnemonic: ({ mnemonic }) => {
        // TODO: if mnemonic change, we also need to re-derive addresses
        set({ mnemonic });
      },
      setRpc: ({ rpc }) => {
        set({ rpc });
      },
    }),
    {
      name: "iron-store",
      storage: createJSONStorage(() => {
        return storageWrapper;
      }),
    }
  )
);

// TODO: this needs to be generated from the mnemonic
function derive(_mnemonic: string, _path: string, _index: number): Address {
  return "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
}
