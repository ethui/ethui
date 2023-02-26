import { WindowPostMessageStream } from "@metamask/post-message-stream";
import { initializeProvider } from "@metamask/providers";

// init on load
(async () => init())();

export async function init() {
  console.log("[inpage] init");

  initProvider();
}

/**
 * injects a `window.ethereum` object
 * conntected to a `WindowPostMessageStream`
 */
function initProvider() {
  const stream = new WindowPostMessageStream({
    name: "iron:inpage",
    target: "iron:contentscript",
  });

  initializeProvider({ connectionStream: stream });
}
