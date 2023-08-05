import { type Duplex } from "stream";

import { WindowPostMessageStream } from "@metamask/post-message-stream";

// import { initializeProvider } from "./initialize";
import { IronProvider } from "./provider";

// init on load
init();

// This can never be async, otherwise window.ethereum won't be injected in time
// for page load
export function init() {
  initializeProvider();
}

// injects a `window.ethereum` object
// conntected to a `WindowPostMessageStream`
// returns The initialized provider (whether set or not).
export function initializeProvider(): IronProvider {
  const connectionStream = new WindowPostMessageStream({
    name: "iron:provider:inpage",
    target: "iron:provider:contentscript",
  }) as unknown as Duplex;

  const provider = new IronProvider({
    connectionStream,
  });

  const proxiedProvider = new Proxy(provider, {
    // some common libraries, e.g. web3@1.x, mess with our API
    deleteProperty: () => true,
  });

  setGlobalProvider(proxiedProvider);

  return proxiedProvider;
}

// Sets the given provider instance as window.ethereum and dispatches the
// 'ethereum#initialized' event on window.
//
// @param providerInstance - The provider instance.
function setGlobalProvider(providerInstance: IronProvider): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as Record<string, any>).ethereum = providerInstance;
  window.dispatchEvent(new Event("ethereum#initialized"));
}
