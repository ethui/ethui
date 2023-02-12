/**
 * Implements the Ethereum Provider API as defined by
 * [MetaMask](https://docs.metamask.io/guide/ethereum-provider.html#table-of-contents)
 */

export const IronWalletStreamName = "iron-wallet-provider";

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

  request(args: RequestArguments): Promise<unknown> {
    // TODO: metamask does a bunch of checks here

    return new Promise((resolve, reject) => {});
  }
}
