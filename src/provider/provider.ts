export const IronWalletStreamName = "iron-wallet-provider";

interface RequestArguments {
  method: string;
  params?: unknown[] | object;
}

type Requester = (req: RequestArguments) => Promise<unknown>;

export class IronProvider {
  readonly connected: boolean;
  readonly requester: Requester;

  /**
   * Initializes RPC connection and middlewares
   */
  constructor(requester: Requester) {
    this.connected = true;
    this.requester = requester;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async request(args: RequestArguments): Promise<unknown> {
    // TODO: metamask does a bunch of checks here

    console.log("[iron] request", args);
    return await this.requester(args);
  }
}
