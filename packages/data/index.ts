import genTokens from "./gen/tokens.json";
import tokens from "./tokens.json";

export interface Token {
  chainId: number;
  address: string | null;
  name: string;
  symbol: string;
}

const tokensHash = [...tokens, ...genTokens].reduce(
  (acc, { address, chainId, name, symbol }) => {
    acc.set(`${chainId}/${address?.toLowerCase()}`, {
      address,
      chainId,
      name,
      symbol,
    });
    return acc;
  },
  new Map<string, Token>(),
);

export function getWhitelistedTokenNameAndSymbol(
  chainId: number,
  address?: string,
): Token | undefined {
  return tokensHash.get(`${chainId}/${address?.toLowerCase()}`);
}
