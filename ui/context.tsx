import { type Stream } from "stream";
import { createContext } from "react";

interface Context {
  stream: Stream;
}

export const ExtensionContext = createContext<Context>(undefined!);
