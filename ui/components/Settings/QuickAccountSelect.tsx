import { Dropdown } from "flowbite-react";
import truncateEthAddress from "truncate-eth-address";

import { deriveFiveAddresses } from "@iron/state/src/addresses";

import { useSettings } from "../../hooks/useSettings";

export function QuickAccountSelect() {
  const settings = useSettings();

  // TODO:
  if (!settings.data) return <>Loading</>;

  const { mnemonic, derivationPath, addressIndex } = settings.data.wallet;
  const addresses = deriveFiveAddresses(mnemonic, derivationPath);
  const current = addresses[addressIndex];

  const handleClick = (i: number) => {
    if (addressIndex == i) return;
    settings.methods.setWalletSettings({
      mnemonic,
      derivationPath,
      addressIndex: i,
    });
  };

  return (
    <Dropdown label={truncateEthAddress(current)}>
      {Object.entries(addresses).map(([i, address]) => (
        <Dropdown.Item key={i} onClick={() => handleClick(parseInt(i))}>
          {address}
        </Dropdown.Item>
      ))}
    </Dropdown>
  );
}
