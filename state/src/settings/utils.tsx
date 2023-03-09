import { type Writable } from "stream";
import { SettingsFullSchema } from ".";

export type Opts = {
  get: () => SettingsFullSchema;

  // TODO: this should be a mandatory field
  // but I'm not sure how to make it available for the `switchToChain` method
  stream?: Writable;
};
