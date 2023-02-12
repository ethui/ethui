/**
 * Implements the Ethereum Provider API as defined by
 * [MetaMask](https://docs.metamask.io/guide/ethereum-provider.html#table-of-contents)
 */

import { JsonRpcEngine, JsonRpcMiddleware } from "json-rpc-engine";
import type {
  JsonRpcId,
  JsonRpcVersion,
  JsonRpcRequest,
} from "json-rpc-engine";
import { createStreamMiddleware } from "json-rpc-middleware-stream";
import { getRpcPromiseCallback, defaultMiddlewares } from "./utils";
import ObjectMultiplex from "@metamask/object-multiplex";
import SafeEventEmitter from "@metamask/safe-event-emitter";
import { duplex as isDuplex } from "is-stream";
import pump from "pump";
import type { Duplex } from "stream";
import { WindowPostMessageStream } from "@metamask/post-message-stream";

export const IronWalletStreamName = "iron-wallet-provider";

interface RequestArguments {
  method: string;
  params?: unknown[] | object;
}

export interface UnvalidatedJsonRpcRequest {
  id?: JsonRpcId;
  jsonrpc?: JsonRpcVersion;
  method: string;
  params?: unknown;
}

export interface JsonRpcConnection {
  events: SafeEventEmitter;
  middleware: JsonRpcMiddleware<unknown, unknown>;
  stream: Duplex;
}

export class IronProvider {
  readonly connected: boolean;
  protected rpc: JsonRpcEngine;
  protected rpcConnection: JsonRpcConnection;

  /**
   * Initializes RPC connection and middlewares
   */
  constructor({
    connectionStream,
  }: {
    connectionStream: WindowPostMessageStream;
  }) {
    this.connected = false;
    this.rpc = new JsonRpcEngine();
    defaultMiddlewares().forEach((m) => this.rpc.push(m));

    console.log(connectionStream);
    // from metamask-providers
    // set up connectionStream multiplexing
    const mux = new ObjectMultiplex();
    pump(
      connectionStream,
      mux as unknown as Duplex,
      connectionStream,
      this.handleStreamDisconnect.bind(this, "Iron wallet RpcProvider")
    );
    this.rpcConnection = createStreamMiddleware({
      retryOnMessage: "IRON_EXTENSION_CONNECT_CAN_RETRY",
    });
    pump(
      this.rpcConnection.stream,
      mux.createStream(IronWalletStreamName) as unknown as Duplex,
      this.rpcConnection.stream,
      this.handleStreamDisconnect.bind(this, "Iron wallet RpcProvider")
    );
    this.rpc.push(this.rpcConnection.middleware);
  }

  isConnected(): boolean {
    return this.connected;
  }

  request(args: RequestArguments): Promise<unknown> {
    // TODO: metamask does a bunch of checks here

    const { method, params } = args;

    return new Promise((resolve, reject) => {
      this.rpcRequest(
        { method, params },
        getRpcPromiseCallback(resolve, reject)
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
    payload: UnvalidatedJsonRpcRequest | UnvalidatedJsonRpcRequest[],
    callback: (...args: any[]) => void
  ) {
    if (!Array.isArray(payload)) {
      if (!payload.jsonrpc) {
        payload.jsonrpc = "2.0";
      }

      // if (
      //   payload.method === "eth_accounts" ||
      //   payload.method === "eth_requestAccounts"
      // ) {
      //   // TODO: handle accounts changing
      // }

      return this.rpc.handle(payload as JsonRpcRequest<unknown>, callback);
    }

    return this.rpc.handle(payload as JsonRpcRequest<unknown>[], callback);
  }

  private handleStreamDisconnect(streamName: string, error: Error) {
    // TODO: check on metamask
  }
}
