import { EthereumRpcError, ethErrors } from "eth-rpc-errors";
import dequal from "fast-deep-equal";
import { isDuplexStream } from "is-stream";
import { JsonRpcEngine, createIdRemapMiddleware } from "json-rpc-engine";
import { createStreamMiddleware } from "json-rpc-middleware-stream";
import log from "loglevel";
import pump from "pump";
import type { Duplex } from "stream";

import ObjectMultiplex from "@metamask/object-multiplex";
import SafeEventEmitter from "@metamask/safe-event-emitter";

import {
  Address,
  ProviderState,
  Request,
  RequestArguments,
  SingleOrBatchRequest,
} from "./types";
import { Maybe, createErrorMiddleware, getRpcPromiseCallback } from "./utils";

export class IronProvider extends SafeEventEmitter {
  /**
   * Indicating that this provider is an Iron provider.
   */
  public readonly isIron: boolean = true;

  protected state: {
    chainId?: string;
    accounts: Address[];
    isConnected: boolean;
    initialized: boolean;
    isPermanentlyDisconnected: boolean;
    engineSetupFinished: boolean;
  };

  protected autoId = 0;
  protected engine: JsonRpcEngine;

  /**
   * Connection creation is lazy.
   * So we need to hold the given connectionStream until we are actually ready to connect
   */
  protected pendingConnectionStream?: Duplex;

  /**
   * @param connectionStream - A Node.js duplex stream
   */
  constructor(connectionStream: Duplex) {
    super();
    this.bindFunctions();
    this.pendingConnectionStream = connectionStream;
    this.setMaxListeners(100);
    this.state = this.defaultState();
    this.engine = new JsonRpcEngine();
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
    // initialization calls `metamask_getProviderState`,
    // so we need to explicitly skip this call to avoid infinite recursion
    if (args.method !== "metamask_getProviderState") {
      await this.initialize();
    }

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
    payload: SingleOrBatchRequest,
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
   * required events.
   *
   * Error codes per the CloseEvent status codes as required by EIP-1193:
   * https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent#Status_codes
   *
   * @param errorMessage - A custom error message.
   * @emits BaseProvider#disconnect
   */
  protected handleDisconnect(errorMessage: string) {
    if (this.state.isConnected || !this.state.isPermanentlyDisconnected) {
      this.state.isConnected = false;

      const error = new EthereumRpcError(
        1011, // Internal error
        errorMessage
      );

      log.error(error);
      this.state.chainId = undefined;
      this.state.accounts = [];
      this.state.isPermanentlyDisconnected = true;

      this.emit("disconnect", error);
    }
  }

  /**
   * Upon receipt of a new `chainId`, emits the corresponding event and sets
   * and sets relevant public state. Does nothing if the given `chainId` is
   * equivalent to the existing value.
   *
   * @emits BaseProvider#chainChanged
   * @param networkInfo.chainId - The latest chain ID.
   */
  protected handleChainChanged({ chainId }: { chainId: string }) {
    log.info("handleChainChanged", { chainId });

    this.handleConnect(chainId);

    if (chainId !== this.state.chainId) {
      this.state.chainId = chainId;
      if (this.state.initialized) {
        this.emit("chainChanged", chainId);
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
  protected handleAccountsChanged(accounts: Address[]): void {
    log.info("handleAccountsChanged", accounts);

    // emit accountsChanged if anything about the accounts array has changed
    if (!dequal(this.state.accounts, accounts)) {
      this.state.accounts = accounts;

      // finally, after all state has been updated, emit the event
      if (this.state.initialized) {
        this.emit("accountsChanged", accounts);
      }
    }
  }

  /**
   * Calls `metamask_getProviderState` and sets initial state
   * if provided and marks this provider as initialized.
   * Throws if called more than once.
   */
  protected async initialize() {
    if (this.state.initialized) {
      return;
    }

    this.setupEngine();

    try {
      const initialState = await this.request<ProviderState>({
        method: "metamask_getProviderState",
      });

      if (this.state.initialized) {
        throw new Error("Provider already initialized.");
      }

      if (initialState) {
        const { accounts, chainId } = initialState;

        // EIP-1193 connect
        this.handleConnect(chainId);
        this.handleChainChanged({ chainId });
        this.handleAccountsChanged(accounts);
      }

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

    this.handleDisconnect(
      error
        ? error.message
        : "Iron: Disconnected from Iron background. Page reload required."
    );
  }

  /* Bind functions to prevent consumers from making unbound calls */
  private bindFunctions() {
    this.handleAccountsChanged = this.handleAccountsChanged.bind(this);
    this.handleConnect = this.handleConnect.bind(this);
    this.handleChainChanged = this.handleChainChanged.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.rpcRequest = this.rpcRequest.bind(this);
    this.request = this.request.bind(this);
    this.handleStreamDisconnect = this.handleStreamDisconnect.bind(this);
  }

  private setupEngine() {
    if (!this.pendingConnectionStream) {
      return;
    }

    const connection = createStreamMiddleware();
    const stream = this.pendingConnectionStream;

    if (!isDuplexStream(stream)) {
      throw new Error("IronProvider - Invalid Duplex Stream");
    }

    this.engine.push(createIdRemapMiddleware());
    this.engine.push(createErrorMiddleware());

    // Set up connectionStream multiplexing
    const mux = new ObjectMultiplex();
    pump(stream, mux as unknown as Duplex, stream, (e) =>
      this.handleStreamDisconnect("Iron constructor", e)
    );

    // Set up RPC connection
    pump(
      connection.stream,
      mux.createStream("iron-provider") as unknown as Duplex,
      connection.stream,
      (e) => this.handleStreamDisconnect("Iron RpcProvider", e)
    );

    // Wire up the JsonRpcEngine to the JSON-RPC connection stream
    this.engine.push(connection.middleware);

    // Handle JSON-RPC notifications
    connection.events.on("notification", ({ method, params }) => {
      switch (method) {
        case "accountsChanged":
          this.handleAccountsChanged(params);
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
          if (method === "eth_subscription") {
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
    this.pendingConnectionStream = undefined;
  }

  private sanitizeRequest(req: Request) {
    return {
      id: req.id || this.nextId(),
      jsonrpc: req.jsonrpc || "2.0",
      method: req.method,
      params: req.params,
    };
  }

  private nextId() {
    this.autoId++;
    return `auto-${this.autoId}`;
  }

  private defaultState() {
    return {
      chainId: undefined,
      accounts: [],
      isConnected: false,
      isUnlocked: false,
      initialized: false,
      isPermanentlyDisconnected: false,
      engineSetupFinished: false,
    };
  }
}
