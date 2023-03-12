import { Dropdown } from "flowbite-react";

import { useSettings } from "../../hooks/useSettings";

export function QuickNetworkSelect() {
  const settings = useSettings();

  // TODO:
  if (!settings.data) return <>Loading</>;

  const { networks, current: currentIdx } = settings.data.network;
  const current = networks[currentIdx];

  const handleClick = (i: number) => {
    if (currentIdx == i) return;
    settings.methods.setCurrentNetwork(i);
  };

  return (
    <Dropdown label={current.name}>
      {networks.map(({ name }, i) => (
        <Dropdown.Item key={i} onClick={() => handleClick(i)}>
          {name}
        </Dropdown.Item>
      ))}
    </Dropdown>
  );
}
