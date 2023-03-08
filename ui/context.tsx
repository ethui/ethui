import { createContext } from "react";
import PortStream from "extension-port-stream";

interface Context {
  stream: typeof PortStream;
}

export const ExtensionContext = createContext<Context>(undefined!);
