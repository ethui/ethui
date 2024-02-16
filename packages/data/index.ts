import tokens from "@iron/data/tokens.json" with { type: "json" };

export interface TokenNameAndSymbol {
  name: string;
  symbol: string;
}

const tokensHash = tokens.reduce((acc, { address, chainId, name, symbol }) => {
  acc.set([chainId, address], { name, symbol });
  return acc;
}, new Map<[number, string], TokenNameAndSymbol>());

export function getWhitelistedTokenNameAndSymbol(
  chainId: number,
  address?: string,
): TokenNameAndSymbol | undefined {
  if (!address) return undefined;

  return tokensHash.get([chainId, address]);
}
