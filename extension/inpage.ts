import { WindowPostMessageStream } from "@metamask/post-message-stream";
import { initializeProvider } from "@iron/provider-inpage";
import { Constants } from "@iron/settings";

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
    name: Constants.provider.inpageStreamName,
    target: Constants.provider.contentscriptStreamName,
  });

  initializeProvider({ connectionStream: stream });
}
