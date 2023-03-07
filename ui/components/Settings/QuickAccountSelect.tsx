import { useStore } from "@iron/state";
import { deriveFiveAddresses } from "@iron/state/src/addresses";
import classnames from "classnames";
import React, { useContext } from "react";
import { ExtensionContext } from "../../context";
import truncateEthAddress from "truncate-eth-address";

export function QuickAccountSelect() {
  const { stream } = useContext(ExtensionContext);
  const [mnemonic, derivationPath, addressIndex, setWalletSettings] = useStore(
    ({ wallet, setWalletSettings }) => [
      wallet.mnemonic,
      wallet.derivationPath,
      wallet.addressIndex,
      setWalletSettings,
    ]
  );

  const addresses = deriveFiveAddresses(mnemonic, derivationPath);
  const current = addresses[addressIndex];

  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    i: number
  ) => {
    e.preventDefault();
    if (addressIndex == i) return;
    setWalletSettings({ mnemonic, derivationPath, addressIndex: i }, stream);
  };

  return (
    <div className="dropdown dropdown-end">
      <label tabIndex={0} className="btn btn-primary m-1 normal-case">
        {truncateEthAddress(current)}
      </label>
      <ul
        tabIndex={0}
        className="dropdown-content menu p-2 shadow bg-base-100 text-black rounded-box"
      >
        {Object.entries(addresses).map(([i, address]) => (
          <li key={i}>
            <a
              onClick={(e) => handleClick(e, parseInt(i))}
              className={classnames("normal-case", {
                "bg-slate-400": parseInt(i) === addressIndex,
              })}
            >
              {address}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
