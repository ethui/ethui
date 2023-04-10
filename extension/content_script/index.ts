import { loadSettings } from "../settings";
import { injectInPageScript } from "./injectInpageScript";
import { initProviderForward } from "./providerForward";

// init on load
(async () => init())();

// This can never be async, otherwise window.ethereum won't be injected in time
// for page load
async function init() {
  await loadSettings();

  initProviderForward();
  injectInPageScript();
}
