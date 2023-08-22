import PortStream from "extension-port-stream";
import log from "loglevel";
import pump, { type Stream } from "pump";
import { type Duplex } from "stream";
import { runtime } from "webextension-polyfill";

import ObjectMultiplex from "@metamask/object-multiplex";
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
    name: "iron:provider:contentscript",
    target: "iron:provider:inpage",
  }) as unknown as Duplex;

  const inpageMux = new ObjectMultiplex();
  (inpageMux as unknown as Duplex).setMaxListeners(25);
  pump(
    inpageMux as unknown as Stream,
    inpageStream,
    inpageMux as unknown as Stream,
    (err) => warnDisconnect("Iron Inpage Multiplex", err)
  );

  const pageChannel = inpageMux.createStream(
    "iron-provider"
  ) as unknown as Duplex;

  // bg stream
  const bgPort = runtime.connect({ name: "iron:contentscript" });
  const bgStream = new PortStream(bgPort);

  // create and connect channel muxers
  // so we can handle the channels individually
  const bgMux = new ObjectMultiplex();
  (bgMux as unknown as Duplex).setMaxListeners(25);
  bgMux.ignoreStream("publicConfig"); // TODO:LegacyProvider: Delete

  pump(
    bgMux as unknown as Stream,
    bgStream,
    bgMux as unknown as Stream,
    (err?: Error) => {
      warnDisconnect("Iron Background Multiplex", err);
    }
  );

  const extensionChannel = bgMux.createStream("iron-provider");
  pump(
    pageChannel,
    extensionChannel as unknown as Stream,
    pageChannel,
    (error?: Error) =>
      log.debug(
        `Iron: Muxed traffic for channel "iron:provider" failed.`,
        error
      )
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

/**
 * Logs a warning if the stream disconnects
 */
function warnDisconnect(remoteLabel: string, error?: Error) {
  log.debug(`[iron] Content script lost connection "${remoteLabel}".`, error);
}
