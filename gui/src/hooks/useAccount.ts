import { ethers } from "ethers";
import { useEffect, useState } from "react";

import { Address, Wallet } from "../types";
import { useInvoke } from "./tauri";

export function useAccount() {
  const { data: wallet } = useInvoke<Wallet>("get_wallet");

  const [address, setAddress] = useState<Address | null>(null);

  useEffect(() => {
    if (!wallet) return;

    // TODO: all the derivation logic should eventually move to the rust side
    // it's both safer and more performant (no need to communicate private
    // keys, or to instantiate HDWallet nodes on the webview)
    const address = deriveAddress(
      wallet.mnemonic,
      wallet.derivationPath,
      wallet.idx
    );
    setAddress(address);
  }, [wallet]);

  return address;
}

function deriveAddress(mnemonic: string, path: string, idx: number): Address {
  const node = ethers.utils.HDNode.fromMnemonic(mnemonic);

  return node.derivePath(`${path}/${idx}`).address as Address;
}
