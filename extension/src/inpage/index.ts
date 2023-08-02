import { type Duplex } from "stream";

import { WindowPostMessageStream } from "@metamask/post-message-stream";

import { initializeProvider } from "./provider";

// init on load
init();

// This can never be async, otherwise window.ethereum won't be injected in time
// for page load
export function init() {
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
  }) as unknown as Duplex;

  initializeProvider({ connectionStream: stream });
}
