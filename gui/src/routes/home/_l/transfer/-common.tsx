import type { TokenBalance } from "@ethui/types";
import type { Network } from "@ethui/types/network";
import { useMemo } from "react";
import { type Address, ethAddress } from "viem";

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

export function useTokenList({
  network,
  native,
  erc20s,
}: {
  network?: Network;
  native?: bigint;
  erc20s: TokenBalance[];
}): Token[] {
  return useMemo(() => {
    if (!network || !native) return [];

    const erc20Tokens = erc20s.map(({ metadata, balance, contract }) => ({
      currency: metadata?.symbol,
      decimals: metadata?.decimals,
      balance: BigInt(balance),
      contract,
    }));
    const nativeToken = {
      currency: network.currency,
      decimals: network.decimals,
      balance: native,
      contract: ethAddress,
    };

    return [nativeToken, ...erc20Tokens];
  }, [erc20s, native, network]);
}
