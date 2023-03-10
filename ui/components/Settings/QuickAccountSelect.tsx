import classnames from "classnames";
import truncateEthAddress from "truncate-eth-address";

import { deriveFiveAddresses } from "@iron/state/src/addresses";

import { useSettings } from "../../hooks/useSettings";

export function QuickAccountSelect() {
  const settings = useSettings();
  console.log("settings", settings.data);

  // TODO:
  if (!settings.data) return <>Loading</>;

  const { mnemonic, derivationPath, addressIndex } = settings.data.wallet;
  const addresses = deriveFiveAddresses(mnemonic, derivationPath);
  const current = addresses[addressIndex];

  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    i: number
  ) => {
    e.preventDefault();
    if (addressIndex == i) return;
    settings.methods.setWalletSettings({
      mnemonic,
      derivationPath,
      addressIndex: i,
    });
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
