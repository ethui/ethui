import type { JsonRpcRequest } from "json-rpc-engine";
import type { JsonRpcMiddleware } from "json-rpc-engine";
import type { JsonRpcId, JsonRpcVersion } from "json-rpc-engine";
import type { Duplex } from "stream";

import type SafeEventEmitter from "@metamask/safe-event-emitter";

export type UnvalidatedSingleOrBatchRequest =
  | UnvalidatedRequest
  | UnvalidatedRequest[];

export interface UnvalidatedRequest {
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

export interface SendSyncJsonRpcRequest extends JsonRpcRequest<unknown> {
  method:
    | "eth_accounts"
    | "eth_coinbase"
    | "eth_uninstallFilter"
    | "net_version";
}

export interface JsonRpcConnection {
  events: SafeEventEmitter;
  middleware: JsonRpcMiddleware<unknown, unknown>;
  stream: Duplex;
}

export interface ExternalProviderState {
  accounts: string[];
  chainId: string;
  isUnlocked: boolean;
  networkVersion?: string;
}
