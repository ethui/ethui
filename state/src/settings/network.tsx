import * as Constants from "@iron/constants";
import { SettingsSection } from ".";
import * as z from "zod";

const schema = z.object({
  rpc: z.string().regex(/^(https?):\/\/[^\s/$.?#].[^\s]*$/),
});

export type NetworkSchema = z.infer<typeof schema>;

export type NetworkFullSchema = NetworkSchema;

export const NetworkSettings: SettingsSection<NetworkSchema, {}> = {
  schema,

  defaults() {
    return {
      rpc: Constants.network.rpc,
    };
  },

  beforeUpdate(settings, _oldSettings, stream) {
    if (settings.rpc != _oldSettings.rpc) {
      stream.write({
        type: "broadcast",
        // TODO: change hardcoded chainid
        payload: {
          method: "chainChanged",
          params: { chainId: "0x1", networkVersion: "mainnet" },
        },
      });
    }

    return settings;
  },
};
