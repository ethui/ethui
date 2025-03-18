import type { Address } from "viem";

export interface Token {
  currency?: string;
  decimals: number;
  balance: bigint;
  contract: Address;
}
