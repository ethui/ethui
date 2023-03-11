import { useContext, useEffect } from "react";
import { useQuery } from "react-query";

import { ExtensionContext } from "../context";

export function useSettings() {
  const {
    remoteState: { state, ping },
  } = useContext(ExtensionContext);

  const { refetch, ...query } = useQuery("settings", () => state.getAll());

  // refetch all data whenever ping is polled
  useEffect(() => {
    ping.onMessage.addListener(refetch);
    () => ping.onMessage.removeListener(refetch);
  }, [ping, refetch]);

  return {
    ...query,
    refetch,
    methods: state,
  };
}
