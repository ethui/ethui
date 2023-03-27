import { ethers } from "ethers";
import _ from "lodash";

import { Address } from "../types";

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

export function deriveFiveAddresses(mnemonic: string, derivationPath: string) {
  return deriveAddresses(mnemonic, derivationPath, 0, 5).reduce(
    (acc: Record<number, Address>, address, i) => {
      acc[i] = address;
      return acc;
    },
    {}
  );
}
