import * as Comlink from "comlink";
import { createEndpoint } from "comlink-extension/src/index";
import { type Runtime, runtime } from "webextension-polyfill";

import { State } from "./schema";

export interface RemoteState {
  state: Comlink.Remote<State>;
  ping: Runtime.Port;
}

export function setupStateClient(): RemoteState {
  const statePort = runtime.connect(undefined, { name: "state-client" });
  const ping = runtime.connect(undefined, { name: "state-ping" });

  return { state: Comlink.wrap(createEndpoint(statePort)), ping };
}
