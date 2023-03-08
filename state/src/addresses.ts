import { ethers } from "ethers";
import _ from "lodash";

export type Address = `0x${string}`;

export function deriveAddress(
  mnemonic: string,
  path: string,
  index: number
): Address {
  const node = ethers.utils.HDNode.fromMnemonic(mnemonic);
  const account = node.derivePath(`${path}/${index}`);

  return account.address as `0x${string}`;
}

export function deriveAddresses(
  mnemonic: string,
  path: string,
  from: number,
  to: number
): Address[] {
  const node = ethers.utils.HDNode.fromMnemonic(mnemonic);

  return _.range(from, to).map(
    (i: number) => node.derivePath(`${path}/${i}`).address as `0x${string}`
  );
}

export function deriveFiveAddresses(
  mnemonic: string,
  derivationPath: string
): Record<number, string> {
  return deriveAddresses(mnemonic, derivationPath, 0, 5).reduce(
    (acc, address, i) => {
      acc[i] = address;
      return acc;
    },
    {}
  );
}
