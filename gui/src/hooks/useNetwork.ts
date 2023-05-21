import { Network } from "../types";
import { useInvoke } from "./tauri";

export function useNetwork() {
  const { data: network, mutate } = useInvoke<Network>("networks_get_current");

  return { network, mutate };
}
