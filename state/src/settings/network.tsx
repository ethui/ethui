import * as Constants from "@iron/constants";
import { SettingsSection } from ".";
import * as z from "zod";

const schema = z.object({
  rpc: z.string().regex(/^(https?):\/\/[^\s/$.?#].[^\s]*$/),
});

export type NetworkSchema = z.infer<typeof schema>;

export const NetworkSettings: SettingsSection<NetworkSchema, {}> = {
  schema,

  defaults() {
    return {
      rpc: Constants.network.rpc,
    };
  },

  beforeUpdate(settings) {
    return settings;
  },
};
