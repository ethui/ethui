import * as Constants from "@iron/constants";
import { SettingsSection } from ".";
import * as z from "zod";

const schema = z.object({
  networks: z.array(
    z.object({
      name: z.string().min(1),
      url: z.string().min(1),
      currency: z.string().min(1),
      chainId: z.number(),
      decimals: z.number(),
    })
  ),
  // rpc: z.string().regex(/^(https?):\/\/[^\s/$.?#].[^\s]*$/),
});

export type NetworkSchema = z.infer<typeof schema>;

export type NetworkFullSchema = NetworkSchema;

export const NetworkSettings: SettingsSection<NetworkSchema, {}> = {
  schema,

  defaults() {
    return {
      networks: Constants.networks,
    };
  },

  beforeUpdate(settings, _oldSettings, stream) {
    // if (settings.rpc != _oldSettings.rpc) {
    //   stream.write({
    //     type: "broadcast",
    //     // TODO: change hardcoded chainid
    //     payload: {
    //       method: "chainChanged",
    //       params: { chainId: "0x1", networkVersion: "mainnet" },
    //     },
    //   });
    // }
    console.log("update", settings);

    return settings;
  },
};
