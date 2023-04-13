import { Address } from "../types";
import { useInvoke } from "./tauri";

export function useAccount() {
  const { data: address } = useInvoke<Address>("get_current_address");

  return address;
}
