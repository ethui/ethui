import type { Duplex } from "node:stream";

import { v4 as uuidv4 } from "@lukeed/uuid";
import { WindowPostMessageStream } from "@metamask/post-message-stream";
import log from "loglevel";
import { type EIP1193Provider, announceProvider } from "mipd";
import { EthUIProvider } from "./provider";
import { name } from "./utils";

const { PROD } = import.meta.env;

// @ts-ignore
import iconProd from "../public/icons/ethui-black.svg?base64";
// @ts-ignore
import iconDev from "../public/icons/ethui-purple.svg?base64";

const icon = PROD ? iconProd : iconDev;

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
    name: `${name}:inpage`,
    target: `${name}:contentscript`,
  }) as unknown as Duplex;

  const provider = new EthUIProvider(connectionStream);

  log.debug("provider", provider);
  setGlobalProvider(provider);

  announceProvider({
    info: {
      icon: `data:image/svg+xml;base64,${icon}`,
      name,
      rdns: "eth.ethui",
      uuid: uuidv4(),
    },
    provider: provider as EIP1193Provider,
  });
}

type ExtendedWindow = Window & typeof globalThis & { ethereum: EthUIProvider };

/**
 * Sets the given provider instance as window.ethereum and dispatches the
 * 'ethereum#initialized' event on window.
 *
 * @param provider - The provider instance.
 */
function setGlobalProvider(provider: EthUIProvider): void {
  (window as ExtendedWindow).ethereum = provider;
  window.dispatchEvent(new Event("ethereum#initialized"));
}
