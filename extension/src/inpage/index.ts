import { v4 as uuidv4 } from "@lukeed/uuid";
import { EIP1193Provider, announceProvider } from "mipd";
import { type Duplex } from "stream";

import { WindowPostMessageStream } from "@metamask/post-message-stream";

import { IronProvider } from "./provider";

/* init on load */
init();

/**
 * This can never be async, otherwise window.ethereum won't be injected in time
 * for page load
 */
export function init() {
  initializeProvider();
}

/**
 * injects a `window.ethereum` object
 * conntected to a `WindowPostMessageStream`
 * returns The initialized provider (whether set or not).
 */
export function initializeProvider() {
  const connectionStream = new WindowPostMessageStream({
    name: "iron:provider:inpage",
    target: "iron:provider:contentscript",
  }) as unknown as Duplex;

  const provider = new IronProvider(connectionStream);

  setGlobalProvider(provider);

  announceProvider({
    info: {
      icon: "https://avatars.githubusercontent.com/u/130035865?s=200&v=4",
      name: "Iron",
      rdns: "eth.iron-wallet",
      uuid: uuidv4(),
    },
    provider: provider as EIP1193Provider,
  });
}

type ExtendedWindow = Window & typeof globalThis & { ethereum: IronProvider };

/**
 * Sets the given provider instance as window.ethereum and dispatches the
 * 'ethereum#initialized' event on window.
 *
 * @param provider - The provider instance.
 */
function setGlobalProvider(provider: IronProvider): void {
  (window as ExtendedWindow).ethereum = provider;
  window.dispatchEvent(new Event("ethereum#initialized"));
}
