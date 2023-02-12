import { Provider } from "./provider";

export function attachGlobalProvider(provider: Provider) {
  console.log("attaching");
  console.log("global", global);
  (global as Record<string, any>).iron = provider;
  console.log((global as any).iron);
  window.dispatchEvent(new Event("ethereum#initialized"));
}
