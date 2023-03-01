import { injectInPageScript } from "./injectInpageScript";
import { initProviderForward } from "./providerForward";

// init on load
init();

function init() {
  console.log("[contentScript] init");

  initProviderForward();
  injectInPageScript();
}
