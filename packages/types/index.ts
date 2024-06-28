import type { Address } from "viem";

export interface TokenBalance {
  contract: Address;
  balance: string;
  metadata: TokenMetadata;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}

export interface Tx {
  hash: `0x${string}`;
  from: Address;
  status: number;
  to?: Address;
  value?: string;
  data?: `0x${string}`;
  blockNumber?: number;
  gasLimit?: string;
  gasUsed?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  type?: number;
  nonce?: number;
  position?: number;
}

export interface PaginatedTx {
  hash: `0x${string}`;
  from: Address;
  to: Address;
  status?: number;
  blockNumber?: number;
}

export interface Contract {
  alias?: string;
  name?: string;
  address: Address;
  chainId: number;
}

export interface Peer {
  origin: string;
  tab_id?: number;
  title?: string;
  socket: string;
  url: string;
  favicon: string;
}

export interface Pagination {
  page?: number;
  page_size?: number;
}

export interface Paginated<T> {
  pagination: Pagination;
  items: T[];
  last: boolean;
  total: number;
}

export type Affinity = { sticky: number } | "global" | "unset";
