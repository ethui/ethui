export interface RequestArguments {
  /* The RPC method to request. */
  method: string;
  /* The params of the RPC method, if any. */
  params?: unknown[] | Record<string, unknown>;
}

export type Address = `0x${string}`;
