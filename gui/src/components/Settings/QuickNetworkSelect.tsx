import { invoke } from "@tauri-apps/api/tauri";
import { Dropdown } from "flowbite-react";
import { useCallback } from "react";

import { useInvoke } from "../../hooks/tauri";
import { Network } from "../../types";

export function QuickNetworkSelect() {
  const { data: networks } = useInvoke<Network[]>("get_networks");
  const { data: current, mutate } = useInvoke<Network>("get_current_network");

  const handleClick = useCallback(
    async (name: string) => {
      if (!current || current.name == name) return;

      await invoke("set_current_network", { network: name });
      mutate();
    },
    [current, mutate]
  );

  if (!networks || !current) return <>Loading</>;

  return (
    <Dropdown label={current.name}>
      {networks.map(({ name }, i) => (
        <Dropdown.Item key={i} onClick={() => handleClick(name)}>
          {name}
        </Dropdown.Item>
      ))}
    </Dropdown>
  );
}
