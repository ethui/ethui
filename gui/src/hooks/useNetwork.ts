import { Network } from "../types";
import { useInvoke } from "./tauri";

export function useNetwork() {
  const { data: network, mutate } = useInvoke<Network>("get_current_network");

  return { network, mutate };
}
