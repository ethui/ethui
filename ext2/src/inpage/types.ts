import type { JsonRpcParams } from "@metamask/utils";

export interface RequestArguments {
  method: string;
  params?: JsonRpcParams;
}

export type Address = `0x${string}`;
