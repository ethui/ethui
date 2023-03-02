import * as z from "zod";

export type Address = `0x${string}`;

export const schemas = {
  wallet: z.object({
    mnemonic: z.string().regex(/^(\w+\s){11}\w+$/),
    derivationPath: z.string(),
    addressIndex: z.number().int().min(0).max(1000),
  }),
  network: z.object({
    rpc: z.string().regex(/^(https?):\/\/[^\s/$.?#].[^\s]*$/),
  }),
};

export type WalletSettings = z.infer<typeof schemas.wallet>;
export type NetworkSettings = z.infer<typeof schemas.network>;

export type Settings = WalletSettings & NetworkSettings;

interface Getters {
  address: () => Address;
}

interface Setters {
  setWalletSettings: (settings: WalletSettings) => void;
  setRpc: (settings: NetworkSettings) => void;
}

type State = Settings & Setters & Getters;
