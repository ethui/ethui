import * as z from "zod";
import { type NetworkSchema, NetworkSettings } from "./network";
import { type WalletSchema, WalletSettings } from "./wallet";

export interface SettingsSection<Schema, Extra> {
  schema: z.ZodSchema<Schema>;

  defaults: () => Schema & Extra;

  beforeUpdate: (settings: Schema) => Schema & Extra;
}

export type SettingsSchema = { wallet: WalletSchema; network: NetworkSchema };

export { NetworkSettings, WalletSettings };

export const defaultSettings: SettingsSchema = {
  wallet: WalletSettings.defaults(),
  network: NetworkSettings.defaults(),
};

export const schemas = {
  wallet: WalletSettings.schema,
  network: NetworkSettings.schema,
};
