import { ethers } from "ethers";
import * as z from "zod";

import * as Constants from "@iron/constants";

import { Address, deriveAddress } from "./addresses";

export const schema = z.object({
  wallet: z.object({
    mnemonic: z.string().regex(/^(\w+\s){11}\w+$/, {
      message: "Must be a 12-word phrase",
    }),
    derivationPath: z.string().regex(/^m\/(\d+'?\/)+\d+$/, {
      message: "invalid path format",
    }),
    addressIndex: z.number().int().min(0).max(3),
    address: z.string(),
  }),

  network: z.object({
    current: z.number(),
    networks: z.array(
      z.object({
        name: z.string().min(1),
        url: z.string().min(1),
        currency: z.string().min(1),
        chainId: z.number(),
        decimals: z.number(),
      })
    ),
  }),
});

export const defaults: Schema = {
  wallet: {
    mnemonic: Constants.wallet.mnemonic,
    derivationPath: Constants.wallet.path,
    addressIndex: Constants.wallet.index,
    address: deriveAddress(
      Constants.wallet.mnemonic,
      Constants.wallet.path,
      Constants.wallet.index
    ),
  },
  network: {
    current: 0,
    networks: Constants.networks,
  },
};

export type Schema = z.infer<typeof schema>;

interface Methods {
  setWalletSettings: (settings: Omit<Schema["wallet"], "address">) => void;
  getAll: () => Schema;
  setNetworks: (networks: Schema["network"]["networks"]) => void;
  setCurrentNetwork: (idx: number) => void;
  getAddress: () => Address;
  getSigner: () => ethers.Signer;
  getProvider: () => ethers.providers.Provider;
}

export type State = Schema & Methods;
