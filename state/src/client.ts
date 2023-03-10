import * as Comlink from "comlink";
import { createEndpoint } from "comlink-extension/src/index";
import { runtime } from "webextension-polyfill";

import { State } from "./schema";

export function setupStateClient(): Comlink.Remote<State> {
  const port = runtime.connect();
  const obj: Comlink.Remote<State> = Comlink.wrap(createEndpoint(port));

  // obj.inc().then((r) => console.log("resp", r));
  obj.getAddress().then(console.log);
  obj.wallet;

  return obj;
}
