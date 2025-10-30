import { formatEther } from "viem";

export function truncateHex(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatTxType(type: number | undefined): string {
  switch (type) {
    case 0:
      return "Legacy";
    case 1:
      return "EIP-2930";
    case 2:
      return "EIP-1559";
    case 3:
      return "EIP-4844";
    default:
      return "Unknown";
  }
}

export function formatBalance(balance: bigint, decimals = 4): string {
  return Number(formatEther(balance))
    .toFixed(decimals)
    .replace(/\.?0+$/, "");
}
