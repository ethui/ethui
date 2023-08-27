import PortStream from "extension-port-stream";
import log from "loglevel";
import { type Duplex } from "stream";
import { runtime } from "webextension-polyfill";

import { WindowPostMessageStream } from "@metamask/post-message-stream";

import { loadSettings } from "../settings";

// init on load
(async () => init())();

async function init() {
  await loadSettings();

  initProviderForward();
  injectInPageScript();
}

/**
 * Sets up a stream to forward messages from the injected page script to the extension's background worker
 */
export function initProviderForward() {
  const inpageStream = new WindowPostMessageStream({
    name: "iron:contentscript",
    target: "iron:inpage",
  }) as unknown as Duplex;

  // bg stream
  const bgPort = runtime.connect({ name: "iron:contentscript" });
  const bgStream = new PortStream(bgPort);

  inpageStream.pipe(bgStream).pipe(inpageStream);
}

/**
 * Injects `inpage.js` into the page.
 *
 * The inpage script is responsible for providing the `window.ethereum` object,
 * which will connect to the stream being forward by this content script
 */
export function injectInPageScript() {
  const url = runtime.getURL("inpage/inpage.js");

  try {
    const container = document.head || document.documentElement;
    const scriptTag = document.createElement("script");
    scriptTag.setAttribute("async", "false");
    scriptTag.setAttribute("src", url);
    container.insertBefore(scriptTag, container.children[0]);
    container.removeChild(scriptTag);
  } catch (error) {
    log.error("Iron Wallet: Provider injection failed.", error);
  }
}
