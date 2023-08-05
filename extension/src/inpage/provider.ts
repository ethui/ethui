import { EthereumRpcError, ethErrors } from "eth-rpc-errors";
import dequal from "fast-deep-equal";
import { isDuplexStream } from "is-stream";
import type { JsonRpcRequest, JsonRpcResponse } from "json-rpc-engine";
import type { JsonRpcMiddleware } from "json-rpc-engine";
import { JsonRpcEngine, JsonRpcId, JsonRpcVersion } from "json-rpc-engine";
import { createStreamMiddleware } from "json-rpc-middleware-stream";
import log from "loglevel";
import pump from "pump";
import type { Duplex } from "stream";

import ObjectMultiplex from "@metamask/object-multiplex";
import SafeEventEmitter from "@metamask/safe-event-emitter";

import messages from "./messages";
import { EMITTED_NOTIFICATIONS, isValidNetworkVersion } from "./utils";
import { NOOP, getDefaultExternalMiddleware } from "./utils";
import { Maybe, getRpcPromiseCallback, isValidChainId } from "./utils";

export interface UnvalidatedJsonRpcRequest {
  id?: JsonRpcId;
  jsonrpc?: JsonRpcVersion;
  method: string;
  params?: unknown;
}

export interface RequestArguments {
  /** The RPC method to request. */
  method: string;

  /** The params of the RPC method, if any. */
  params?: unknown[] | Record<string, unknown>;
}

export interface ProviderState {
  accounts: null | string[];
  isConnected: boolean;
  isUnlocked: boolean;
  initialized: boolean;
  isPermanentlyDisconnected: boolean;
}

function defaultState(): ProviderState {
  return {
    accounts: null,
    isConnected: false,
    isUnlocked: false,
    initialized: false,
    isPermanentlyDisconnected: false,
  };
}

export interface SendSyncJsonRpcRequest extends JsonRpcRequest<unknown> {
  method:
    | "eth_accounts"
    | "eth_coinbase"
    | "eth_uninstallFilter"
    | "net_version";
}

type WarningEventName = keyof SentWarningsState["events"];

export interface IronProviderOptions {
  // The stream used to connect to the wallet.
  connectionStream: Duplex;
  // The name of the stream used to connect to the wallet.
  jsonRpcStreamName?: string;
  // The maximum number of event listeners.
  maxEventListeners?: number;
  // `json-rpc-engine` middleware. The middleware will be inserted in the given
  // order immediately after engine initialization.
  rpcMiddleware?: JsonRpcMiddleware<unknown, unknown>[];
}

interface SentWarningsState {
  // methods
  enable: boolean;
  experimentalMethods: boolean;
  send: boolean;
  // events
  events: {
    close: boolean;
    data: boolean;
    networkChanged: boolean;
    notification: boolean;
  };
}

export interface JsonRpcConnection {
  events: SafeEventEmitter;
  middleware: JsonRpcMiddleware<unknown, unknown>;
  stream: Duplex;
}

export class IronProvider extends SafeEventEmitter {
  // The chain ID of the currently connected Ethereum chain.
  // See [chainId.network]{@link https://chainid.network} for more information.
  public chainId: string | null;

  // The user's currently selected Ethereum address.
  // If null, Iron is either locked or the user has not permitted any
  // addresses to be viewed.
  public selectedAddress: string | null;

  // Experimental methods can be found here.
  public readonly _metamask: ReturnType<IronProvider["_getExperimentalApi"]>;

  protected state: ProviderState;
  protected engine: JsonRpcEngine;
  protected sentWarnings: SentWarningsState = {
    // methods
    enable: false,
    experimentalMethods: false,
    send: false,
    // events
    events: {
      close: false,
      data: false,
      networkChanged: false,
      notification: false,
    },
  };
  protected connection: JsonRpcConnection;

  public networkVersion: string | null;

  /**
   * Indicating that this provider is a Iron provider.
   */
  public readonly isIron: boolean = true;
  public readonly isMetaMask: boolean = true;

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
    jsonRpcStreamName = "metamask-provider",
    maxEventListeners = 100,
    rpcMiddleware = getDefaultExternalMiddleware(),
  }: IronProviderOptions) {
    // start: old BaseProvider.constructor
    // end: old BaseProvider.constructor
    super();
    this.setMaxListeners(maxEventListeners);

    // Private state
    this.state = defaultState();

    // Public state
    this.selectedAddress = null;
    this.chainId = null;

    // Bind functions to prevent consumers from making unbound calls
    this.handleAccountsChanged = this.handleAccountsChanged.bind(this);
    this.handleConnect = this.handleConnect.bind(this);
    this.handleChainChanged = this.handleChainChanged.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.handleUnlockStateChanged = this.handleUnlockStateChanged.bind(this);
    this.rpcRequest = this.rpcRequest.bind(this);
    this.request = this.request.bind(this);

    // Handle RPC requests via dapp-side RPC engine.
    //
    // ATTN: Implementers must push a middleware that hands off requests to
    // the server.
    const rpcEngine = new JsonRpcEngine();
    rpcMiddleware.forEach((middleware) => rpcEngine.push(middleware));
    this.engine = rpcEngine;

    // start old AbstractStreamProvider.constructor
    if (!isDuplexStream(connectionStream)) {
      throw new Error(messages.errors.invalidDuplexStream());
    }

    // Bind functions to prevent consumers from making unbound calls
    this.handleStreamDisconnect = this.handleStreamDisconnect.bind(this);

    // Set up connectionStream multiplexing
    const mux = new ObjectMultiplex();
    pump(
      connectionStream,
      mux as unknown as Duplex,
      connectionStream,
      this.handleStreamDisconnect.bind(this, "Iron constructor") as any
    );

    // Set up RPC connection
    this.connection = createStreamMiddleware({
      retryOnMessage: "METAMASK_EXTENSION_CONNECT_CAN_RETRY",
    });
    pump(
      this.connection.stream,
      mux.createStream(jsonRpcStreamName) as unknown as Duplex,
      this.connection.stream,
      this.handleStreamDisconnect.bind(this, "Iron RpcProvider") as any
    );

    // Wire up the JsonRpcEngine to the JSON-RPC connection stream
    this.engine.push(this.connection.middleware);

    // Handle JSON-RPC notifications
    this.connection.events.on("notification", (payload) => {
      const { method, params } = payload;
      if (method === "accountsChanged") {
        log.info("handleAccountsChanged", params);
        this.handleAccountsChanged(params);
      } else if (method === "metamask_unlockStateChanged") {
        log.info("handleUnlockStateChanged");
        this.handleUnlockStateChanged(params);
      } else if (method === "chainChanged") {
        log.info("handleChainChanged", params);
        this.handleChainChanged(params);
      } else if (EMITTED_NOTIFICATIONS.includes(method)) {
        log.info("emitting", method);
        this.emit("message", {
          type: method,
          data: params,
        });
      } else if (method === "METAMASK_STREAM_FAILURE") {
        connectionStream.destroy(
          new Error(messages.errors.permanentlyDisconnected())
        );
      } else {
        log.error("unexpected message", payload);
      }
    });
    // end old AbstractStreamProvider.constructor

    // We shouldn't perform asynchronous work in the constructor, but at one
    // point we started doing so, and changing this class isn't worth it at
    // the time of writing.
    this._initializeStateAsync();

    this.networkVersion = null;

    this._sendSync = this._sendSync.bind(this);
    this.enable = this.enable.bind(this);
    this.send = this.send.bind(this);
    this.sendAsync = this.sendAsync.bind(this);
    this._warnOfDeprecation = this._warnOfDeprecation.bind(this);

    this._metamask = this._getExperimentalApi();

    // handle JSON-RPC notifications
    this.connection.events.on("notification", (payload) => {
      const { method } = payload;
      if (EMITTED_NOTIFICATIONS.includes(method)) {
        // deprecated
        // emitted here because that was the original order
        this.emit("data", payload);
        // deprecated
        this.emit("notification", payload.params.result);
      }
    });
  }

  // start: old BaseProvider._initializeStateAsync
  //====================
  // Public Methods
  //====================

  /**
   * Returns whether the provider can process RPC requests.
   */
  isConnected(): boolean {
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
  async request<T>(args: RequestArguments): Promise<Maybe<T>> {
    if (!args || typeof args !== "object" || Array.isArray(args)) {
      throw ethErrors.rpc.invalidRequest({
        message: messages.errors.invalidRequestArgs(),
        data: args,
      });
    }

    const { method, params } = args;

    if (typeof method !== "string" || method.length === 0) {
      throw ethErrors.rpc.invalidRequest({
        message: messages.errors.invalidRequestMethod(),
        data: args,
      });
    }

    if (
      params !== undefined &&
      !Array.isArray(params) &&
      (typeof params !== "object" || params === null)
    ) {
      throw ethErrors.rpc.invalidRequest({
        message: messages.errors.invalidRequestParams(),
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

  //====================
  // Private Methods
  //====================

  /**
   * **MUST** be called by child classes.
   *
   * Sets initial state if provided and marks this provider as initialized.
   * Throws if called more than once.
   *
   * Permits the `networkVersion` field in the parameter object for
   * compatibility with child classes that use this value.
   *
   * @param initialState - The provider's initial state.
   * @emits BaseProvider#_initialized
   * @emits BaseProvider#connect - If `initialState` is defined.
   */
  protected _initializeState(initialState?: {
    accounts: string[];
    chainId: string;
    isUnlocked: boolean;
    networkVersion?: string;
  }) {
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
  }

  /**
   * Internal RPC method. Forwards requests to background via the RPC engine.
   * Also remap ids inbound and outbound.
   *
   * @param payload - The RPC request object.
   * @param callback - The consumer's callback.
   */
  protected rpcRequest(
    payload: UnvalidatedJsonRpcRequest | UnvalidatedJsonRpcRequest[],
    cb: (...args: unknown[]) => void
  ) {
    if (!Array.isArray(payload)) {
      if (!payload.jsonrpc) {
        payload.jsonrpc = "2.0";
      }

      return this.engine.handle(payload as JsonRpcRequest<unknown>, cb);
    }
    return this.engine.handle(payload as JsonRpcRequest<unknown>[], cb);
  }

  /**
   * When the provider becomes connected, updates internal state and emits
   * required events. Idempotent.
   *
   * @param chainId - The ID of the newly connected chain.
   * @emits IronProvider#connect
   */
  private handleConnect(chainId: string) {
    if (!this.state.isConnected) {
      this.state.isConnected = true;
      this.emit("connect", { chainId });
      log.debug(messages.info.connected(chainId));
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
          errorMessage || messages.errors.disconnected()
        );
        log.debug(error);
      } else {
        error = new EthereumRpcError(
          1011, // Internal error
          errorMessage || messages.errors.permanentlyDisconnected()
        );

        log.error(error);
        this.chainId = null;
        this.state.accounts = null;
        this.selectedAddress = null;
        this.state.isUnlocked = false;
        this.state.isPermanentlyDisconnected = true;
      }

      this.emit("disconnect", error);
    }

    if (this.networkVersion && !isRecoverable) {
      this.networkVersion = null;
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
    // This will validate the params and disconnect the provider if the
    // networkVersion is 'loading'.
    // start: old AbstractProvider.handleChainChanged
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
      log.error(messages.errors.invalidNetworkParams(), {
        chainId,
        networkVersion,
      });
      return;
    }

    if (networkVersion === "loading") {
      this.handleDisconnect(true);
    } else {
      if (!isValidChainId(chainId)) {
        log.error(messages.errors.invalidNetworkParams(), { chainId });
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
        this.selectedAddress = (_accounts[0] as string) || null;
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
  // end: old BaseProvider._initializeStateAsync

  //====================
  // Public Methods
  //====================

  /**
   * Submits an RPC request per the given JSON-RPC request object.
   *
   * @param payload - The RPC request object.
   * @param callback - The callback function.
   */
  sendAsync(
    payload: JsonRpcRequest<unknown>,
    callback: (error: Error | null, result?: JsonRpcResponse<unknown>) => void
  ): void {
    this.rpcRequest(payload, callback as any);
  }

  /**
   * We override the following event methods so that we can warn consumers
   * about deprecated events:
   *   addListener, on, once, prependListener, prependOnceListener
   */

  addListener(eventName: string, listener: (...args: unknown[]) => void) {
    this._warnOfDeprecation(eventName);
    return super.addListener(eventName, listener);
  }

  on(eventName: string, listener: (...args: unknown[]) => void) {
    this._warnOfDeprecation(eventName);
    return super.on(eventName, listener);
  }

  once(eventName: string, listener: (...args: unknown[]) => void) {
    this._warnOfDeprecation(eventName);
    return super.once(eventName, listener);
  }

  prependListener(eventName: string, listener: (...args: unknown[]) => void) {
    this._warnOfDeprecation(eventName);
    return super.prependListener(eventName, listener);
  }

  prependOnceListener(
    eventName: string,
    listener: (...args: unknown[]) => void
  ) {
    this._warnOfDeprecation(eventName);
    return super.prependOnceListener(eventName, listener);
  }

  //====================
  // Private Methods
  //====================

  /**
   * Warns of deprecation for the given event, if applicable.
   */
  protected _warnOfDeprecation(eventName: string): void {
    if (this.sentWarnings?.events[eventName as WarningEventName] === false) {
      log.warn(messages.warnings.events[eventName as WarningEventName]);
      this.sentWarnings.events[eventName as WarningEventName] = true;
    }
  }

  //====================
  // Deprecated Methods
  //====================

  /**
   * Equivalent to: ethereum.request('eth_requestAccounts')
   *
   * @deprecated Use request({ method: 'eth_requestAccounts' }) instead.
   * @returns A promise that resolves to an array of addresses.
   */
  enable(): Promise<string[]> {
    if (!this.sentWarnings.enable) {
      log.warn(messages.warnings.enableDeprecation);
      this.sentWarnings.enable = true;
    }

    return new Promise<string[]>((resolve, reject) => {
      try {
        this.rpcRequest(
          { method: "eth_requestAccounts", params: [] },
          getRpcPromiseCallback(resolve as any, reject) as any
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Submits an RPC request for the given method, with the given params.
   *
   * @deprecated Use "request" instead.
   * @param method - The method to request.
   * @param params - Any params for the method.
   * @returns A Promise that resolves with the JSON-RPC response object for the
   * request.
   */
  send<T>(method: string, params?: T[]): Promise<JsonRpcResponse<T>>;

  /**
   * Submits an RPC request per the given JSON-RPC request object.
   *
   * @deprecated Use "request" instead.
   * @param payload - A JSON-RPC request object.
   * @param callback - An error-first callback that will receive the JSON-RPC
   * response object.
   */
  send<T>(
    payload: JsonRpcRequest<unknown>,
    callback: (error: Error | null, result?: JsonRpcResponse<T>) => void
  ): void;

  /**
   * Accepts a JSON-RPC request object, and synchronously returns the cached result
   * for the given method. Only supports 4 specific RPC methods.
   *
   * @deprecated Use "request" instead.
   * @param payload - A JSON-RPC request object.
   * @returns A JSON-RPC response object.
   */
  send<T>(payload: SendSyncJsonRpcRequest): JsonRpcResponse<T>;

  send(methodOrPayload: unknown, callbackOrArgs?: unknown): unknown {
    if (!this.sentWarnings.send) {
      log.warn(messages.warnings.sendDeprecation);
      this.sentWarnings.send = true;
    }

    if (
      typeof methodOrPayload === "string" &&
      (!callbackOrArgs || Array.isArray(callbackOrArgs))
    ) {
      return new Promise((resolve, reject) => {
        try {
          this.rpcRequest(
            { method: methodOrPayload, params: callbackOrArgs },
            getRpcPromiseCallback(resolve, reject, false) as any
          );
        } catch (error) {
          reject(error);
        }
      });
    } else if (
      methodOrPayload &&
      typeof methodOrPayload === "object" &&
      typeof callbackOrArgs === "function"
    ) {
      return this.rpcRequest(
        methodOrPayload as JsonRpcRequest<unknown>,
        callbackOrArgs as (...args: unknown[]) => void
      );
    }
    return this._sendSync(methodOrPayload as SendSyncJsonRpcRequest);
  }

  /**
   * Internal backwards compatibility method, used in send.
   *
   * @deprecated
   */
  protected _sendSync(payload: SendSyncJsonRpcRequest) {
    let result;
    switch (payload.method) {
      case "eth_accounts":
        result = this.selectedAddress ? [this.selectedAddress] : [];
        break;

      case "eth_coinbase":
        result = this.selectedAddress || null;
        break;

      case "eth_uninstallFilter":
        this.rpcRequest(payload, NOOP);
        result = true;
        break;

      case "net_version":
        result = this.networkVersion || null;
        break;

      default:
        throw new Error(messages.errors.unsupportedSync(payload.method));
    }

    return {
      id: payload.id,
      jsonrpc: payload.jsonrpc,
      result,
    };
  }

  /**
   * Constructor helper.
   *
   * Gets the experimental _metamask API as Proxy, so that we can warn consumers
   * about its experimental nature.
   */
  protected _getExperimentalApi() {
    return new Proxy(
      {
        /**
         * Determines if Iron is unlocked by the user.
         *
         * @returns Promise resolving to true if Iron is currently unlocked
         */
        isUnlocked: async () => {
          if (!this.state.initialized) {
            await new Promise<void>((resolve) => {
              this.on("_initialized", () => resolve());
            });
          }
          return this.state.isUnlocked;
        },

        /**
         * Make a batch RPC request.
         */
        requestBatch: async (requests: UnvalidatedJsonRpcRequest[]) => {
          if (!Array.isArray(requests)) {
            throw ethErrors.rpc.invalidRequest({
              message:
                "Batch requests must be made with an array of request objects.",
              data: requests,
            });
          }

          return new Promise((resolve, reject) => {
            this.rpcRequest(
              requests,
              getRpcPromiseCallback(resolve, reject) as any
            );
          });
        },
      },
      {
        get: (obj, prop, ...args) => {
          if (!this.sentWarnings.experimentalMethods) {
            log.warn(messages.warnings.experimentalMethods);
            this.sentWarnings.experimentalMethods = true;
          }
          return Reflect.get(obj, prop, ...args);
        },
      }
    );
  }

  // start: old AbstractProvider methods

  //====================
  // Private Methods
  //====================

  /**
   * **MUST** be called by child classes.
   *
   * Calls `metamask_getProviderState` and passes the result to
   * {@link BaseProvider._initializeState}. Logs an error if getting initial state
   * fails. Throws if called after initialization has completed.
   */
  protected async _initializeStateAsync() {
    let initialState: Parameters<IronProvider["_initializeState"]>[0];

    try {
      initialState = (await this.request({
        method: "metamask_getProviderState",
      })) as Parameters<IronProvider["_initializeState"]>[0];
    } catch (error) {
      log.error(
        "Iron: Failed to get initial state. Please report this bug.",
        error
      );
    }
    this._initializeState(initialState);
  }

  /**
   * Called when connection is lost to critical streams. Emits an 'error' event
   * from the provider with the error message and stack if present.
   *
   * @emits BaseProvider#disconnect
   */
  private handleStreamDisconnect(streamName: string, error: Error) {
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

  // end: old AbstractProvider methods
}
