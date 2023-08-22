import type { JsonRpcId, JsonRpcVersion } from "json-rpc-engine";

export type SingleOrBatchRequest = Request | Request[];

export interface Request {
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
  accounts: Address[];
  chainId: string;
  isUnlocked: boolean;
}

export type Address = `0x${string}`;
