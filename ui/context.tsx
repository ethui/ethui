import * as Comlink from "comlink";
import { createContext } from "react";
import { type Writable } from "stream";

import { State } from "@iron/state";

interface Context {
  remoteState: Comlink.Remote<State>;
  stream: Writable;
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const ExtensionContext = createContext<Context>(undefined!);
