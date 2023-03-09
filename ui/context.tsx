import { createContext } from "react";
import { type Writable } from "stream";

interface Context {
  stream: Writable;
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const ExtensionContext = createContext<Context>(undefined!);
