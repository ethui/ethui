import { type Duplex } from "stream";
import { WindowPostMessageStream } from "@metamask/post-message-stream";
import log from "loglevel";
import { runtime } from "webextension-polyfill";

import { loadSettings } from "@/settings";

declare global {
  interface Document {
    prerendering: boolean;
  }
}

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
function initProviderForward() {
  // https://bugs.chromium.org/p/chromium/issues/detail?id=1457040
  // and related discussion: https://groups.google.com/a/chromium.org/g/chromium-extensions/c/gHAEKspcdRY?pli=1
  // Temporary workaround for chromium bug that breaks the content script <=> background connection
  // for prerendered pages. This delays connection setup until the page is in active state
  if (document.prerendering) {
    document.addEventListener("prerenderingchange", () => {
      if (!document.prerendering) {
        initProviderForward();
      }
    });
    return;
  }

  const inpageStream = new WindowPostMessageStream({
    name: "iron:contentscript",
    target: "iron:inpage",
  }) as unknown as Duplex;

  // bg stream
  const bgPort = runtime.connect({ name: "iron:contentscript" });

  // inpage -> bg
  inpageStream.on("data", (data) => {
    bgPort.postMessage(data);
  });
  // bg -> inpage
  bgPort.onMessage.addListener((data) => {
    inpageStream.write(data);
  });
  bgPort.onDisconnect.addListener(() =>
    log.error("[Iron - contentscript] disconnected"),
  );
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
