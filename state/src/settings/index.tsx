import { Writable } from "stream";
import * as z from "zod";

import {
  type NetworkFullSchema,
  NetworkSchema,
  NetworkSettings,
} from "./network";
import { type WalletFullSchema, WalletSchema, WalletSettings } from "./wallet";

export interface SettingsSection<Schema, Derived> {
  schema: z.ZodSchema<Schema>;

  defaults: () => Schema & Derived;
}

export type Opts = {
  get: () => SettingsFullSchema;
  stream: Writable;
};

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
