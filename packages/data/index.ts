import tokens from "@iron/data/tokens.json" with { type: "json" };

const tokensHash = tokens.reduce((acc, { address, chainId }) => {
  acc.add([chainId, address]);
  return acc;
}, new Set<[number, string]>());

export function isWhitelistedToken(chainId: number, address: string): boolean {
  return tokensHash.has([chainId, address]);
}
