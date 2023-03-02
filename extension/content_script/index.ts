import { injectInPageScript } from "./injectInpageScript";
import { initProviderForward } from "./providerForward";

// init on load
init();

// This can never be async, otherwise window.ethereum won't be injected in time
// for page load
function init() {
  console.log("[contentScript] init");

  initProviderForward();
  injectInPageScript();
}
