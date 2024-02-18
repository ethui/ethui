import { type Duplex } from "stream";
import {
  createIdRemapMiddleware,
  JsonRpcEngine,
} from "@metamask/json-rpc-engine";
import { type Json, type JsonRpcResponse } from "@metamask/utils";
import { EthereumRpcError } from "eth-rpc-errors";
import { EventEmitter } from "eventemitter3";
import { isDuplexStream } from "is-stream";
import { createStreamMiddleware } from "json-rpc-middleware-stream";
import log from "loglevel";

import { Address, RequestArguments } from "./types";
import { errorMiddleware } from "./utils";

export class IronProvider extends EventEmitter {
  protected initialized = false;
  protected autoId = 0;
  protected engine: JsonRpcEngine;
  protected stream: Duplex;

  /**
   * @param connectionStream - A Node.js duplex stream
   */
  constructor(stream: Duplex) {
    super();
    this.bindFunctions();
    this.stream = stream;
    this.engine = new JsonRpcEngine();
  }

  private bindFunctions() {
    this.request = this.request.bind(this);
    this.handleConnect = this.handleConnect.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.handleChainChanged = this.handleChainChanged.bind(this);
    this.handleAccountsChanged = this.handleAccountsChanged.bind(this);
    this.initialize = this.initialize.bind(this);
    this.nextId = this.nextId.bind(this);
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
   * TODO: handle batch calls
   */
  public async request({ method, params }: RequestArguments): Promise<unknown> {
    log.debug("request", { method, params });
    this.initialize();

    const resp: JsonRpcResponse<Json> = await this.engine.handle({
      method,
      params,
      id: this.nextId(),
      jsonrpc: "2.0",
    });

    if ("error" in resp) {
      throw resp.error;
    }

    if (Array.isArray(resp)) {
      return resp;
    } else {
      return resp.result;
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
    this.emit("connect", { chainId });
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
    const error = new EthereumRpcError(
      1011, // Internal error
      errorMessage,
    );

    log.error(error);
    this.emit("disconnect", error);
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
    this.emit("chainChanged", chainId);
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
    this.emit("accountsChanged", accounts);
  }

  protected initialize() {
    if (this.initialized) {
      return;
    }

    const connection = createStreamMiddleware();

    if (!isDuplexStream(this.stream)) {
      throw new Error("IronProvider - Invalid Duplex Stream");
    }

    this.engine.push(createIdRemapMiddleware());
    this.engine.push(errorMiddleware);

    connection.stream.pipe(this.stream).pipe(connection.stream);

    // Wire up the JsonRpcEngine to the JSON-RPC connection stream
    this.engine.push(connection.middleware as unknown as any);

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
          this.stream.destroy(
            new Error(
              "Iron: Disconnected from Iron background. Page reload required.",
            ),
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

    this.initialized = true;
  }

  private nextId() {
    this.autoId++;
    return `auto-${this.autoId}`;
  }
}
