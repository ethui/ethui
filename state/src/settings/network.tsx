import * as Constants from "@iron/constants";
import * as z from "zod";
import { type Stream } from "stream";
import { SettingsFullSchema } from ".";

const schema = z.object({
  current: z.number(),
  networks: z.array(
    z.object({
      name: z.string().min(1),
      url: z.string().min(1),
      currency: z.string().min(1),
      chainId: z.number(),
      decimals: z.number(),
    })
  ),
});

export type NetworkSchema = z.infer<typeof schema>;

export type NetworkFullSchema = NetworkSchema;

type Opts = {
  get: () => SettingsFullSchema;
  stream: Stream;
};

export const NetworkSettings = {
  schema,

  defaults() {
    return {
      current: 0,
      networks: Constants.networks,
    };
  },

  // change the existing list of networks
  setNetworks(
    networks: NetworkSchema["networks"],
    { get, stream: _stream }: Opts
  ): NetworkFullSchema {
    return { ...get().network, networks };
  },

  // change the currently connected network
  // updates only the index of the current list of networks to point to
  setCurrentNetwork(idx: number, { get, stream }: Opts) {
    const oldNetwork = get().network;

    // notify only if new value is actually different
    if (oldNetwork.current != idx) {
      stream.write({
        type: "broadcast",
        // TODO: change hardcoded chainid
        payload: {
          method: "chainChanged",
          params: { chainId: "0x1", networkVersion: "mainnet" },
        },
      });
    }
    console.log("switch", oldNetwork.current, idx);

    return { ...oldNetwork, current: idx };
  },
};
