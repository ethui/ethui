import * as z from "zod";
import {
  NetworkSchema,
  NetworkSettings,
  type NetworkFullSchema,
} from "./network";
import { type WalletFullSchema, WalletSettings, WalletSchema } from "./wallet";

export interface SettingsSection<Schema, Derived> {
  schema: z.ZodSchema<Schema>;

  defaults: () => Schema & Derived;
}

export type SettingsSchema = {
  wallet: WalletSchema;
  network: NetworkSchema;
};

export type SettingsFullSchema = {
  wallet: WalletFullSchema;
  network: NetworkFullSchema;
};

export { NetworkSettings, WalletSettings };

export const defaultSettings: SettingsFullSchema = {
  wallet: WalletSettings.defaults(),
  network: NetworkSettings.defaults(),
};

export const schemas = {
  wallet: WalletSettings.schema,
  network: NetworkSettings.schema,
};
