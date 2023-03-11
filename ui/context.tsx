import * as Comlink from "comlink";
import { createContext } from "react";

import { State } from "@iron/state";
import { RemoteState } from "@iron/state/src/client";

interface Context {
  remoteState: RemoteState;
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const ExtensionContext = createContext<Context>(undefined!);
