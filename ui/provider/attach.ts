import type { IronProvider } from "./provider";

export function attachGlobalProvider(provider: IronProvider) {
  (global as Record<string, any>).iron = provider;
  (global as Record<string, any>).ethereum = provider;
  window.dispatchEvent(new Event("ethereum#initialized"));
}
