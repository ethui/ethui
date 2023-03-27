import { WindowPostMessageStream } from "@metamask/post-message-stream";

import { initializeProvider } from "./provider-inpage";

// init on load
init();

// This can never be async, otherwise window.ethereum won't be injected in time
// for page load
export function init() {
  console.log("[inpage] init");

  initProvider();
}

/**
 * injects a `window.ethereum` object
 * conntected to a `WindowPostMessageStream`
 */
function initProvider() {
  const stream = new WindowPostMessageStream({
    name: "iron:provider:inpage",
    target: "iron:provider:contentscript",
  });

  initializeProvider({ connectionStream: stream });
}
