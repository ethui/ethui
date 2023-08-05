import { ethErrors } from "eth-rpc-errors";
import { isDuplexStream } from "is-stream";
import type { JsonRpcRequest, JsonRpcResponse } from "json-rpc-engine";
import type { JsonRpcMiddleware } from "json-rpc-engine";
import { createStreamMiddleware } from "json-rpc-middleware-stream";
import log from "loglevel";
import pump from "pump";
import type { Duplex } from "stream";

import ObjectMultiplex from "@metamask/object-multiplex";
import SafeEventEmitter from "@metamask/safe-event-emitter";

import { BaseProvider, BaseProviderOptions } from "./BaseProvider";
import { UnvalidatedJsonRpcRequest } from "./BaseProvider";
import messages from "./messages";
import {
  EMITTED_NOTIFICATIONS,
  isValidChainId,
  isValidNetworkVersion,
} from "./utils";
import {
  NOOP,
  getDefaultExternalMiddleware,
  getRpcPromiseCallback,
} from "./utils";

export interface SendSyncJsonRpcRequest extends JsonRpcRequest<unknown> {
  method:
    | "eth_accounts"
    | "eth_coinbase"
    | "eth_uninstallFilter"
    | "net_version";
}

type WarningEventName = keyof SentWarningsState["events"];

export type IronInpageProviderOptions = Partial<
  Omit<StreamProviderOptions, "rpcMiddleware">
>;

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

export interface StreamProviderOptions extends BaseProviderOptions {
  /**
   * The name of the stream used to connect to the wallet.
   */
  jsonRpcStreamName: string;
}

export interface JsonRpcConnection {
  events: SafeEventEmitter;
  middleware: JsonRpcMiddleware<unknown, unknown>;
  stream: Duplex;
}

export class IronInpageProvider extends BaseProvider {
  protected _sentWarnings: SentWarningsState = {
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

  protected _jsonRpcConnection: JsonRpcConnection;

  /**
   * Experimental methods can be found here.
   */
  public readonly _metamask: ReturnType<
    IronInpageProvider["_getExperimentalApi"]
  >;

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
  constructor(
    connectionStream: Duplex,
    {
      jsonRpcStreamName = "metamask-provider",
      maxEventListeners,
    }: IronInpageProviderOptions = {}
  ) {
    // super(connectionStream, {
    //   jsonRpcStreamName,
    //   maxEventListeners,
    //   rpcMiddleware: getDefaultExternalMiddleware(),
    // });
    super({ maxEventListeners, rpcMiddleware: getDefaultExternalMiddleware() });

    // start old AbstractStreamProvider.constructor
    if (!isDuplexStream(connectionStream)) {
      throw new Error(messages.errors.invalidDuplexStream());
    }

    // Bind functions to prevent consumers from making unbound calls
    this._handleStreamDisconnect = this._handleStreamDisconnect.bind(this);

    // Set up connectionStream multiplexing
    const mux = new ObjectMultiplex();
    pump(
      connectionStream,
      mux as unknown as Duplex,
      connectionStream,
      this._handleStreamDisconnect.bind(this, "Iron constructor") as any
    );

    // Set up RPC connection
    this._jsonRpcConnection = createStreamMiddleware({
      retryOnMessage: "METAMASK_EXTENSION_CONNECT_CAN_RETRY",
    });
    pump(
      this._jsonRpcConnection.stream,
      mux.createStream(jsonRpcStreamName) as unknown as Duplex,
      this._jsonRpcConnection.stream,
      this._handleStreamDisconnect.bind(this, "Iron RpcProvider") as any
    );

    // Wire up the JsonRpcEngine to the JSON-RPC connection stream
    this._rpcEngine.push(this._jsonRpcConnection.middleware);

    // Handle JSON-RPC notifications
    this._jsonRpcConnection.events.on("notification", (payload) => {
      const { method, params } = payload;
      if (method === "accountsChanged") {
        // eslint-disable-next-line no-console
        console.log("handleAccountsChanged", params);
        this._handleAccountsChanged(params);
      } else if (method === "metamask_unlockStateChanged") {
        // eslint-disable-next-line no-console
        console.log("handleUnlockStateChanged");
        this._handleUnlockStateChanged(params);
      } else if (method === "chainChanged") {
        // eslint-disable-next-line no-console
        console.log("handleChainChanged", params);
        this._handleChainChanged(params);
      } else if (EMITTED_NOTIFICATIONS.includes(method)) {
        // eslint-disable-next-line no-console
        console.log("emitting", method);
        this.emit("message", {
          type: method,
          data: params,
        });
      } else if (method === "METAMASK_STREAM_FAILURE") {
        connectionStream.destroy(
          new Error(messages.errors.permanentlyDisconnected())
        );
      } else {
        console.error("unexpected message", payload);
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
    this._jsonRpcConnection.events.on("notification", (payload) => {
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
    this._rpcRequest(payload, callback as any);
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
  protected _handleDisconnect(isRecoverable: boolean, errorMessage?: string) {
    super._handleDisconnect(isRecoverable, errorMessage);
    if (this.networkVersion && !isRecoverable) {
      this.networkVersion = null;
    }
  }

  /**
   * Warns of deprecation for the given event, if applicable.
   */
  protected _warnOfDeprecation(eventName: string): void {
    if (this._sentWarnings?.events[eventName as WarningEventName] === false) {
      log.warn(messages.warnings.events[eventName as WarningEventName]);
      this._sentWarnings.events[eventName as WarningEventName] = true;
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
    if (!this._sentWarnings.enable) {
      log.warn(messages.warnings.enableDeprecation);
      this._sentWarnings.enable = true;
    }

    return new Promise<string[]>((resolve, reject) => {
      try {
        this._rpcRequest(
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
    if (!this._sentWarnings.send) {
      log.warn(messages.warnings.sendDeprecation);
      this._sentWarnings.send = true;
    }

    if (
      typeof methodOrPayload === "string" &&
      (!callbackOrArgs || Array.isArray(callbackOrArgs))
    ) {
      return new Promise((resolve, reject) => {
        try {
          this._rpcRequest(
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
      return this._rpcRequest(
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
        this._rpcRequest(payload, NOOP);
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
          if (!this._state.initialized) {
            await new Promise<void>((resolve) => {
              this.on("_initialized", () => resolve());
            });
          }
          return this._state.isUnlocked;
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
            this._rpcRequest(
              requests,
              getRpcPromiseCallback(resolve, reject) as any
            );
          });
        },
      },
      {
        get: (obj, prop, ...args) => {
          if (!this._sentWarnings.experimentalMethods) {
            log.warn(messages.warnings.experimentalMethods);
            this._sentWarnings.experimentalMethods = true;
          }
          return Reflect.get(obj, prop, ...args);
        },
      }
    );
  }

  /**
   * Upon receipt of a new chainId and networkVersion, emits corresponding
   * events and sets relevant public state. Does nothing if neither the chainId
   * nor the networkVersion are different from existing values.
   *
   * @emits MetamaskInpageProvider#networkChanged
   * @param networkInfo - An object with network info.
   * @param networkInfo.chainId - The latest chain ID.
   * @param networkInfo.networkVersion - The latest network ID.
   */
  protected _handleChainChanged({
    chainId,
    networkVersion,
  }: { chainId?: string; networkVersion?: string } = {}) {
    // This will validate the params and disconnect the provider if the
    // networkVersion is 'loading'.
    // start: old AbstractProvider._handleChainChanged
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
      this._handleDisconnect(true);
    } else {
      super._handleChainChanged({ chainId });
    }
    // end: old AbstractProvider._handleChainChanged

    if (this._state.isConnected && networkVersion !== this.networkVersion) {
      this.networkVersion = networkVersion as string;
      if (this._state.initialized) {
        this.emit("networkChanged", this.networkVersion);
      }
    }
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
    let initialState: Parameters<BaseProvider["_initializeState"]>[0];

    try {
      initialState = (await this.request({
        method: "metamask_getProviderState",
      })) as Parameters<BaseProvider["_initializeState"]>[0];
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
  private _handleStreamDisconnect(streamName: string, error: Error) {
    let warningMsg = `Iron: Lost connection to "${streamName}".`;
    if (error?.stack) {
      warningMsg += `\n${error.stack}`;
    }

    log.warn(warningMsg);
    if (this.listenerCount("error") > 0) {
      this.emit("error", warningMsg);
    }

    this._handleDisconnect(false, error ? error.message : undefined);
  }

  // end: old AbstractProvider methods
}
