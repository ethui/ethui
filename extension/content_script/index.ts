import { injectInPageScript } from "./injectInpageScript";
import { initProviderForward } from "./providerForward";

// init on load
(async () => init())();

export async function init() {
  console.log("[contentScript] init");

  initProviderForward();
  injectInPageScript();
}
