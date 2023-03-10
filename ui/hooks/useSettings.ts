import { useContext } from "react";
import { useQuery } from "react-query";

import { ExtensionContext } from "../context";

export function useSettings() {
  const { remoteState } = useContext(ExtensionContext);

  const query = useQuery("settings", () => remoteState.getAll());

  return {
    ...query,
    methods: remoteState,
  };
}
