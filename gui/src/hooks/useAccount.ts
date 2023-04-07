import { Wallet } from "../types";
import { useInvoke } from "./tauri";

export function useAccount() {
  const { data: address } = useInvoke<Wallet>("get_current_address");

  return address;
}
