import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import { useCallback, useEffect, useState } from "react";

import { useInvoke } from "../../hooks/tauri";
import { Network } from "../../types";
import Dropdown from "../Base/Dropdown";

export function QuickNetworkSelect() {
  const { data: networks } = useInvoke<Network[]>("get_networks");
  const { data: current, mutate } = useInvoke<Network>("get_current_network");

  const [options, setOptions] = useState<Record<string, string>>({});
  const handleClick = useCallback(
    async (name: string) => {
      if (!current || current.name == name) return;

      await invoke("set_current_network", { network: name });
      mutate();
    },
    [current, mutate]
  );

  useEffect(() => {
    const unlisten = listen("refresh-network", () => {
      mutate();
    });

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [mutate]);

  useEffect(() => {
    if (!networks) return;

    const options = networks.reduce((acc, { name }) => {
      acc[name] = name;
      return acc;
    }, {} as Record<string, string>);
    setOptions(options);
  }, [networks]);

  if (!networks || !current) return <>Loading</>;

  return (
    <Dropdown
      label={current.name}
      entries={options}
      onChange={(key) => handleClick(key)}
    />
  );
}
