import { EthereumRpcError, ethErrors } from "eth-rpc-errors";
import dequal from "fast-deep-equal";
import { isDuplexStream } from "is-stream";
import { JsonRpcEngine } from "json-rpc-engine";
import { createStreamMiddleware } from "json-rpc-middleware-stream";
import log from "loglevel";
import pump from "pump";
import type { Duplex } from "stream";

import ObjectMultiplex from "@metamask/object-multiplex";
import SafeEventEmitter from "@metamask/safe-event-emitter";

import {
  ExternalProviderState,
  JsonRpcConnection,
  RequestArguments,
  UnvalidatedRequest,
  UnvalidatedSingleOrBatchRequest,
} from "./types";
import {
  EMITTED_NOTIFICATIONS,
  Maybe,
  getDefaultExternalMiddleware,
  getRpcPromiseCallback,
  isValidChainId,
  isValidNetworkVersion,
} from "./utils";

interface IronProviderOptions {
  /* The stream used to connect to the wallet. */
  connectionStream: Duplex;
  /* The name of the stream used to connect to the wallet. */
  jsonRpcStreamName: string;
  /* The maximum number of event listeners. */
  maxEventListeners: number;
}

export class IronProvider extends SafeEventEmitter {
  /**
   * The chain ID of the currently connected Ethereum chain.
   * See [chainId.network]{@link https://chainid.network} for more information.
   */
  public chainId?: string;

  /**
   * The user's currently selected Ethereum address.
   * If null, Iron is either locked or the user has not permitted any
   * addresses to be viewed.
   */
  public selectedAddress?: string;

  public networkVersion?: string;

  /**
   * Indicating that this provider is an Iron provider.
   */
  public readonly isIron: boolean = true;

  protected state: {
    accounts: null | string[];
    isConnected: boolean;
    isUnlocked: boolean;
    initialized: boolean;
    isPermanentlyDisconnected: boolean;
  };

  protected autoId = 0;
  protected engine: JsonRpcEngine;
  protected connection: JsonRpcConnection;
  protected sentWarnings: Record<string, boolean> = {};

  /**
   * @param connectionStream - A Node.js duplex stream
   * @param options - An options bag
   * @param options.jsonRpcStreamName - The name of the internal JSON-RPC stream.
   * Default: iron:provider
   * @param options.maxEventListeners - The maximum number of event
   * listeners. Default: 100
   */
  constructor({
    connectionStream,
    jsonRpcStreamName,
    maxEventListeners,
  }: IronProviderOptions) {
    super();
    this.setMaxListeners(maxEventListeners);
    this.state = this.defaultState();
    this.engine = new JsonRpcEngine();
    this.connection = createStreamMiddleware({
      retryOnMessage: "METAMASK_EXTENSION_CONNECT_CAN_RETRY",
    });

    this.bindFunctions();
    this.setupEngine(connectionStream, jsonRpcStreamName);

    // We shouldn't perform asynchronous work in the constructor, but at one
    // point we started doing so, and changing this class isn't worth it at
    // the time of writing.
    this.initializeStateAsync();
  }

  // Returns whether the provider can process RPC requests.
  public isConnected(): boolean {
    return this.state.isConnected;
  }

  /**
   * Submits an RPC request for the given method, with the given params.
   * Resolves with the result of the method call, or rejects on error.
   *
   * @param args - The RPC request arguments.
   * @param args.method - The RPC method name.
   * @param args.params - The parameters for the RPC method.
   * @returns A Promise that resolves with the result of the RPC method,
   * or rejects if an error is encountered.
   */
  public async request<T>(args: RequestArguments): Promise<Maybe<T>> {
    if (!args || typeof args !== "object" || Array.isArray(args)) {
      throw ethErrors.rpc.invalidRequest({
        message: "Expected a single, non-array, object argument",
        data: args,
      });
    }

    const { method, params } = args;

    if (typeof method !== "string" || method.length === 0) {
      throw ethErrors.rpc.invalidRequest({
        message: `'args.method' must be a non-empty string.`,
        data: args,
      });
    }

    if (
      params !== undefined &&
      !Array.isArray(params) &&
      (typeof params !== "object" || params === null)
    ) {
      throw ethErrors.rpc.invalidRequest({
        message: `'args.params' must be an object or array if provided.`,
        data: args,
      });
    }

    return new Promise<T>((resolve, reject) => {
      this.rpcRequest(
        { method, params },
        getRpcPromiseCallback(resolve as any, reject) as any
      );
    });
  }

  /**
   * Internal RPC method. Forwards requests to background via the RPC engine.
   * Also remap ids inbound and outbound.
   *
   * @param payload - The RPC request object.
   * @param callback - The consumer's callback.
   */
  protected rpcRequest(
    payload: UnvalidatedSingleOrBatchRequest,
    cb: (...args: unknown[]) => void
  ) {
    if (!Array.isArray(payload)) {
      const request = this.sanitizeRequest(payload);
      return this.engine.handle(request, cb);
    } else {
      const request = payload.map(this.sanitizeRequest);
      return this.engine.handle(request, cb);
    }
  }

  /**
   * When the provider becomes connected, updates internal state and emits
   * required events. Idempotent.
   *
   * @param chainId - The ID of the newly connected chain.
   * @emits IronProvider#connect
   */
  protected handleConnect(chainId: string) {
    if (!this.state.isConnected) {
      this.state.isConnected = true;
      this.emit("connect", { chainId });
      log.debug(`Iron: Connected to chain with ID "${chainId}".`);
    }
  }

  /**
   * When the provider becomes disconnected, updates internal state and emits
   * required events. Idempotent with respect to the isRecoverable parameter.
   *
   * Error codes per the CloseEvent status codes as required by EIP-1193:
   * https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent#Status_codes
   *
   * @param isRecoverable - Whether the disconnection is recoverable.
   * @param errorMessage - A custom error message.
   * @emits BaseProvider#disconnect
   */
  protected handleDisconnect(isRecoverable: boolean, errorMessage?: string) {
    if (
      this.state.isConnected ||
      (!this.state.isPermanentlyDisconnected && !isRecoverable)
    ) {
      this.state.isConnected = false;

      let error;
      if (isRecoverable) {
        error = new EthereumRpcError(
          1013, // Try again later
          errorMessage ||
            "Iron: Disconnected from chain. Attempting to connect."
        );
        log.debug(error);
      } else {
        error = new EthereumRpcError(
          1011, // Internal error
          errorMessage ||
            "Iron: Disconnected from Iron background. Page reload required."
        );

        log.error(error);
        this.chainId = undefined;
        this.state.accounts = null;
        this.selectedAddress = undefined;
        this.state.isUnlocked = false;
        this.state.isPermanentlyDisconnected = true;
      }

      this.emit("disconnect", error);
    }

    if (this.networkVersion && !isRecoverable) {
      this.networkVersion = undefined;
    }
  }

  /**
   * Upon receipt of a new `chainId`, emits the corresponding event and sets
   * and sets relevant public state. Does nothing if the given `chainId` is
   * equivalent to the existing value.
   *
   * Permits the `networkVersion` field in the parameter object for
   * compatibility with child classes that use this value.
   *
   * @emits BaseProvider#chainChanged
   * @param networkInfo - An object with network info.
   * @param networkInfo.chainId - The latest chain ID.
   * @param networkInfo.networkVersion - The latest network ID.
   */
  protected handleChainChanged({
    chainId,
    networkVersion,
  }: { chainId?: string; networkVersion?: string } = {}) {
    log.info("handleChainChanged", { chainId, networkVersion });

    // This will validate the params and disconnect the provider if the
    // networkVersion is 'loading'.
    /**
     * Upon receipt of a new chainId and networkVersion, emits corresponding
     * events and sets relevant public state. This class does not have a
     * `networkVersion` property, but we rely on receiving a `networkVersion`
     * with the value of `loading` to detect when the network is changing and
     * a recoverable `disconnect` even has occurred. Child classes that use the
     * `networkVersion` for other purposes must implement additional handling
     * therefore.
     *
     * @emits BaseProvider#chainChanged
     * @param networkInfo - An object with network info.
     * @param networkInfo.chainId - The latest chain ID.
     * @param networkInfo.networkVersion - The latest network ID.
     */
    if (!isValidChainId(chainId) || !isValidNetworkVersion(networkVersion)) {
      log.error(
        "Iron: Received invalid network parameters. Please report this bug.",
        {
          chainId,
          networkVersion,
        }
      );
      return;
    }

    if (networkVersion === "loading") {
      this.handleDisconnect(true);
    } else {
      if (!isValidChainId(chainId)) {
        log.error(
          "Iron: Received invalid network parameters. Please report this bug.",
          { chainId }
        );
        return;
      }

      this.handleConnect(chainId);

      if (chainId !== this.chainId) {
        this.chainId = chainId;
        if (this.state.initialized) {
          this.emit("chainChanged", this.chainId);
        }
      }
    }
    // end: old AbstractProvider.handleChainChanged

    if (this.state.isConnected && networkVersion !== this.networkVersion) {
      this.networkVersion = networkVersion as string;
      if (this.state.initialized) {
        this.emit("networkChanged", this.networkVersion);
      }
    }
  }

  /**
   * Called when accounts may have changed. Diffs the new accounts value with
   * the current one, updates all state as necessary, and emits the
   * accountsChanged event.
   *
   * @param accounts - The new accounts value.
   * @param isEthAccounts - Whether the accounts value was returned by
   * a call to eth_accounts.
   */
  protected handleAccountsChanged(accounts: unknown[]): void {
    log.info("handleAccountsChanged", accounts);
    let _accounts = accounts;

    if (!Array.isArray(accounts)) {
      log.error(
        "Iron: Received invalid accounts parameter. Please report this bug.",
        accounts
      );
      _accounts = [];
    }

    for (const account of accounts) {
      if (typeof account !== "string") {
        log.error(
          "Iron: Received non-string account. Please report this bug.",
          accounts
        );
        _accounts = [];
        break;
      }
    }

    // emit accountsChanged if anything about the accounts array has changed
    if (!dequal(this.state.accounts, _accounts)) {
      this.state.accounts = _accounts as string[];

      // handle selectedAddress
      if (this.selectedAddress !== _accounts[0]) {
        this.selectedAddress = (_accounts[0] as string) || undefined;
      }

      // finally, after all state has been updated, emit the event
      if (this.state.initialized) {
        this.emit("accountsChanged", _accounts);
      }
    }
  }

  /**
   * Upon receipt of a new isUnlocked state, sets relevant public state.
   * Calls the accounts changed handler with the received accounts, or an empty
   * array.
   *
   * Does nothing if the received value is equal to the existing value.
   * There are no lock/unlock events.
   *
   * @param opts - Options bag.
   * @param opts.accounts - The exposed accounts, if any.
   * @param opts.isUnlocked - The latest isUnlocked value.
   */
  protected handleUnlockStateChanged({
    accounts,
    isUnlocked,
  }: { accounts?: string[]; isUnlocked?: boolean } = {}) {
    log.info("handleUnlockStateChanged", { accounts, isUnlocked });

    if (typeof isUnlocked !== "boolean") {
      log.error(
        "Iron: Received invalid isUnlocked parameter. Please report this bug."
      );
      return;
    }

    if (isUnlocked !== this.state.isUnlocked) {
      this.state.isUnlocked = isUnlocked;
      this.handleAccountsChanged(accounts || []);
    }
  }

  /**
   * **MUST** be called by child classes.
   *
   * Calls `metamask_getProviderState` and sets initial state
   * if provided and marks this provider as initialized.
   * Throws if called more than once.
   *
   * Permits the `networkVersion` field in the parameter object for
   * compatibility with child classes that use this value.
   */
  protected async initializeStateAsync() {
    try {
      const initialState = await this.request<ExternalProviderState>({
        method: "metamask_getProviderState",
      });

      if (this.state.initialized === true) {
        throw new Error("Provider already initialized.");
      }

      if (initialState) {
        const { accounts, chainId, isUnlocked, networkVersion } = initialState;

        // EIP-1193 connect
        this.handleConnect(chainId);
        this.handleChainChanged({ chainId, networkVersion });
        this.handleUnlockStateChanged({ accounts, isUnlocked });
        this.handleAccountsChanged(accounts);
      }

      // Mark provider as initialized regardless of whether initial state was
      // retrieved.
      this.state.initialized = true;
      this.emit("_initialized");
    } catch (error) {
      log.error(
        "Iron: Failed to get initial state. Please report this bug.",
        error
      );
    }
  }

  /**
   * Called when connection is lost to critical streams. Emits an 'error' event
   * from the provider with the error message and stack if present.
   *
   * @emits BaseProvider#disconnect
   */
  private handleStreamDisconnect(streamName: string, error?: Error) {
    let warningMsg = `Iron: Lost connection to "${streamName}".`;
    if (error?.stack) {
      warningMsg += `\n${error.stack}`;
    }

    log.warn(warningMsg);
    if (this.listenerCount("error") > 0) {
      this.emit("error", warningMsg);
    }

    this.handleDisconnect(false, error ? error.message : undefined);
  }

  /* Bind functions to prevent consumers from making unbound calls */
  private bindFunctions() {
    this.handleAccountsChanged = this.handleAccountsChanged.bind(this);
    this.handleConnect = this.handleConnect.bind(this);
    this.handleChainChanged = this.handleChainChanged.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.handleUnlockStateChanged = this.handleUnlockStateChanged.bind(this);
    this.rpcRequest = this.rpcRequest.bind(this);
    this.request = this.request.bind(this);
    this.handleStreamDisconnect = this.handleStreamDisconnect.bind(this);
  }

  private setupEngine(stream: Duplex, streamName: string) {
    if (!isDuplexStream(stream)) {
      throw new Error("IronProvider - Invalid Duplex Stream");
    }

    // Handle RPC requests via dapp-side RPC engine.
    getDefaultExternalMiddleware().forEach((middleware) =>
      this.engine.push(middleware)
    );

    // Set up connectionStream multiplexing
    const mux = new ObjectMultiplex();
    pump(stream, mux as unknown as Duplex, stream, (e) =>
      this.handleStreamDisconnect("Iron constructor", e)
    );

    // Set up RPC connection
    pump(
      this.connection.stream,
      mux.createStream(streamName) as unknown as Duplex,
      this.connection.stream,
      (e) => this.handleStreamDisconnect("Iron RpcProvider", e)
    );

    // Wire up the JsonRpcEngine to the JSON-RPC connection stream
    this.engine.push(this.connection.middleware);

    // Handle JSON-RPC notifications
    this.connection.events.on("notification", ({ method, params }) => {
      switch (method) {
        case "accountsChanged":
          this.handleAccountsChanged(params);
          break;

        case "metamask_unlockStateChanged":
          this.handleUnlockStateChanged(params);
          break;

        case "chainChanged":
          this.handleChainChanged(params);
          break;

        case "METAMASK_STREAM_FAILURE":
          stream.destroy(
            new Error(
              "Iron: Disconnected from Iron background. Page reload required."
            )
          );
          break;

        default:
          if (EMITTED_NOTIFICATIONS.includes(method)) {
            log.info("emitting", method);

            this.emit("message", {
              type: method,
              data: params,
            });
          } else {
            log.error("unexpected message", { method, params });
          }
      }
    });
  }

  private sanitizeRequest(req: UnvalidatedRequest) {
    return {
      id: req.id || this.nextId(),
      jsonrpc: req.jsonrpc || "2.0",
      method: req.method,
      params: req.params,
    };
  }

  private nextId() {
    this.autoId++;
    return `auto-${this.nextId}`;
  }

  private defaultState() {
    return {
      accounts: null,
      isConnected: false,
      isUnlocked: false,
      initialized: false,
      isPermanentlyDisconnected: false,
    };
  }
}
