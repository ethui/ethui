import { WindowPostMessageStream } from "@metamask/post-message-stream";
import browser from "webextension-polyfill";
import PortStream from "extension-port-stream";
import ObjectMultiplex from "@metamask/object-multiplex";
import pump, { Stream } from "pump";

let inpageStream;
let inpageChannel;
let bgStream;
let bgChannel;

const provider = "iron-provider";

export function init() {
  console.log("[contentScript] init");
  injectInPageScript();
  setupStreams();
}

function injectInPageScript() {
  const url = browser.runtime.getURL("src/extension/inpage.js");

  try {
    const container = document.head || document.documentElement;
    const scriptTag = document.createElement("script");
    scriptTag.setAttribute("async", "false");
    scriptTag.setAttribute("src", url);
    container.insertBefore(scriptTag, container.children[0]);
    container.removeChild(scriptTag);
  } catch (error) {
    console.error("Iron Wallet: Provider injection failed.", error);
  }
}

function setupStreams() {
  //
  // cs <-> inpage
  //
  inpageStream = new WindowPostMessageStream({
    name: "contentscript",
    target: "inpage",
  });

  const inpageMux = new ObjectMultiplex();
  pump(
    inpageMux as unknown as Stream,
    inpageStream as unknown as Stream,
    inpageMux as unknown as Stream,
    (err: any) => logStreamDisconnect("Inpage Multiplex", err)
  );

  //
  // cs <-> background
  //
  const bgPort = browser.runtime.connect({ name: "port" });
  bgStream = new PortStream(bgPort);

  const bgMux = new ObjectMultiplex();
  pump(
    bgMux as unknown as Stream,
    bgStream,
    bgMux as unknown as Stream,
    (err: any) => {
      logStreamDisconnect("Background multiplex failed", err);
    }
  );

  //
  // background <-> page forward, "provider" channel
  //
  inpageChannel = inpageMux.createStream("provider");
  bgChannel = bgMux.createStream("provider");
  pump(
    inpageChannel as unknown as Stream,
    bgChannel as unknown as Stream,
    inpageChannel as unknown as Stream,
    (err: any) => {
      logStreamDisconnect(`Muxed traffic for channel ${provider} failed`, err);
    }
  );
}

function logStreamDisconnect(remoteLabel: string, error: any) {
  console.debug(
    `[Iron] Content script lost connection to "${remoteLabel}".`,
    error
  );
}
