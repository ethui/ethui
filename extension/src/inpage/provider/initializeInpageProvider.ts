import { Duplex } from "stream";

import {
  IronInpageProvider,
  IronInpageProviderOptions,
} from "./IronInpageProvider";

interface InitializeProviderOptions extends IronInpageProviderOptions {
  /**
   * The stream used to connect to the wallet.
   */
  connectionStream: Duplex;

  /**
   * Whether the provider should be set as window.ethereum.
   */
  shouldSetOnWindow?: boolean;
}

/**
 * Initializes a IronInpageProvider and (optionally) assigns it as window.ethereum.
 *
 * @param options - An options bag.
 * @param options.connectionStream - A Node.js stream.
 * @param options.jsonRpcStreamName - The name of the internal JSON-RPC stream.
 * @param options.maxEventListeners - The maximum number of event listeners.
 * @param options.shouldSetOnWindow - Whether the provider should be set as window.ethereum.
 * @param options.shouldShimWeb3 - Whether a window.web3 shim should be injected.
 * @returns The initialized provider (whether set or not).
 */
export function initializeProvider({
  connectionStream,
  jsonRpcStreamName,
  logger = console,
  maxEventListeners = 100,
  shouldSetOnWindow = true,
}: InitializeProviderOptions): IronInpageProvider {
  const provider = new IronInpageProvider(connectionStream, {
    jsonRpcStreamName,
    logger,
    maxEventListeners,
  });

  const proxiedProvider = new Proxy(provider, {
    // some common libraries, e.g. web3@1.x, mess with our API
    deleteProperty: () => true,
  });

  if (shouldSetOnWindow) {
    setGlobalProvider(proxiedProvider);
  }

  return proxiedProvider;
}

/**
 * Sets the given provider instance as window.ethereum and dispatches the
 * 'ethereum#initialized' event on window.
 *
 * @param providerInstance - The provider instance.
 */
export function setGlobalProvider(providerInstance: IronInpageProvider): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as Record<string, any>).ethereum = providerInstance;
  window.dispatchEvent(new Event("ethereum#initialized"));
}
