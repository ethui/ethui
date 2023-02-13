export const IronWalletStreamName = "iron-wallet-provider";
import { requestToBackground } from "./messenger";

interface RequestArguments {
  method: string;
  params?: unknown[] | object;
}

export class IronProvider {
  readonly connected: boolean;

  /**
   * Initializes RPC connection and middlewares
   */
  constructor() {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async request(args: RequestArguments): unknown {
    // TODO: metamask does a bunch of checks here

    return await requestToBackground({ type: "eth", message: args });
    // return new Promise((resolve, reject) => {});
  }
}

export function attachGlobalProvider(provider: IronProvider) {
  (global as Record<string, any>).iron = provider;
  (global as Record<string, any>).ethereum = provider;
  window.dispatchEvent(new Event("ethereum#initialized"));
}
