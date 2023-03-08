import * as z from "zod";
import {
  NetworkSchema,
  NetworkSettings,
  type NetworkFullSchema,
} from "./network";
import { type WalletFullSchema, WalletSettings, WalletSchema } from "./wallet";
import { type Stream } from "stream";

export interface SettingsSection<Schema, Derived> {
  schema: z.ZodSchema<Schema>;

  defaults: () => Schema & Derived;
}

export type SettingsOpts = {
  get: () => SettingsFullSchema;
  stream?: Stream;
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
