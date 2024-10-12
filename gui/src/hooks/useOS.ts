import { type } from "@tauri-apps/plugin-os";

export function useOS() {
  return { type: type() };
}
