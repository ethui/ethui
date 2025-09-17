import type { Address } from "viem";
import type { NetworkId } from "./network";

export interface Token {
  contract: Address;
  metadata: TokenMetadata;
}

export interface TokenBalance {
  contract: Address;
  balance: string;
  metadata: TokenMetadata;
}

export interface TokenMetadata {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
}

export interface Erc20Metadata {
  decimals: number;
  logo: string;
  name: string;
  symbol: string;
}

export interface Erc20FullData {
  metadata: TokenMetadata;
  alchemy_metadata: Erc20Metadata;
}

// the single 'Erc' naming refers to ERC721 and ERC1155 tokens

export interface ErcMetadata {
  name: string;
  description: string;
}

export interface ErcContract {
  address: Address;
  name: string;
  symbol: string;
  tokenType: string;
}

export interface ErcImageData {
  originalUrl: string;
}

export interface ErcRawMetadata {
  metadata: ErcMetadata;
}

export interface ErcFullData {
  contract: ErcContract;
  tokenId: number;
  image: ErcImageData;
  raw: ErcRawMetadata;
  balance: number;
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
  position?: number;
}

export interface Contract {
  alias?: string;
  name?: string;
  address: Address;
  chainId: number;
  proxyName?: string;
  proxyFor?: Address;
  proxiedBy?: Address;
}

export interface Peer {
  origin: string;
  socket: string;
  url: string;
}

export type Affinity = { sticky: NetworkId } | "global" | "unset";

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };
