import type { Address } from "viem";

export interface Token {
  currency?: string;
  decimals: number;
  balance: bigint;
  contract: Address;
}

export function parseAmount(num: string, decimals: number): bigint {
  if (Number.isNaN(Number.parseFloat(num))) {
    throw new Error("Invalid value");
  }

  // Split into integer and fractional parts
  const [integerPart, fractionalPart = ""] = num.split(".");
  let baseUnits = BigInt(integerPart) * BigInt(10) ** BigInt(decimals);
  if (fractionalPart.length > 0) {
    // Only take up to 'decimalsCount' digits from the fractional part
    const frac = fractionalPart.padEnd(decimals, "0").slice(0, decimals);
    baseUnits += BigInt(frac);
  }
  return baseUnits;
}
