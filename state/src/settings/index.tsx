import * as z from "zod";
import { NetworkSettings, type NetworkFullSchema } from "./network";
import { type WalletFullSchema, WalletSettings } from "./wallet";
import { type Stream } from "stream";

export interface SettingsSection<Schema, Derived> {
  schema: z.ZodSchema<Schema>;

  defaults: () => Schema & Derived;

  beforeUpdate: (
    newSettings: Schema,
    oldSettings: Schema & Derived,
    stream: Stream
  ) => Schema & Derived;
}

export type SettingsSchema = {
  wallet: WalletFullSchema;
  network: NetworkFullSchema;
};

export { NetworkSettings, WalletSettings };

export const defaultSettings: SettingsSchema = {
  wallet: WalletSettings.defaults(),
  network: NetworkSettings.defaults(),
};

export const schemas = {
  wallet: WalletSettings.schema,
  network: NetworkSettings.schema,
};
