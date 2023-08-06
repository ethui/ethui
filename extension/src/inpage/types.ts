import type { JsonRpcRequest } from "json-rpc-engine";
import type { JsonRpcMiddleware } from "json-rpc-engine";
import type { JsonRpcId, JsonRpcVersion } from "json-rpc-engine";
import type { Duplex } from "stream";

import type SafeEventEmitter from "@metamask/safe-event-emitter";

export interface UnvalidatedJsonRpcRequest {
  id?: JsonRpcId;
  jsonrpc?: JsonRpcVersion;
  method: string;
  params?: unknown;
}

export interface RequestArguments {
  /* The RPC method to request. */
  method: string;
  /* The params of the RPC method, if any. */
  params?: unknown[] | Record<string, unknown>;
}

export interface ProviderState {
  accounts: null | string[];
  isConnected: boolean;
  isUnlocked: boolean;
  initialized: boolean;
  isPermanentlyDisconnected: boolean;
}

export interface SendSyncJsonRpcRequest extends JsonRpcRequest<unknown> {
  method:
    | "eth_accounts"
    | "eth_coinbase"
    | "eth_uninstallFilter"
    | "net_version";
}

export type WarningEventName = keyof SentWarningsState["events"];

export interface SentWarningsState {
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
