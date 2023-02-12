import { WindowPostMessageStream } from "@metamask/post-message-stream";
import browser from "webextension-polyfill";
import { CONTENT_SCRIPT_ID, INPAGE_ID, PROVIDER_ID } from "../constants";
import PortStream from "extension-port-stream";
import pump from "pump";
import ObjectMultiplex from "@metamask/object-multiplex";

export class ContentScript {
  constructor() {
    console.log("[contentScript] init");
    this.injectInPageScript();
    this.listenForMessages();
    this.initializeWindowStream();
  }

  private injectInPageScript() {
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

  private listenForMessages() {
    browser.runtime.onMessage.addListener((message: any, sender: any) => {
      console.log("content-script received: ", message, sender);
    });
  }

  private initializeWindowStream() {
    // page streams

    // the transport-specific streams for communication between inpage and background
    const pageStream = new WindowPostMessageStream({
      name: CONTENT_SCRIPT_ID,
      target: INPAGE_ID,
    });

    // create and connect channel muxers
    // so we can handle the channels individually
    const pageMux = new ObjectMultiplex();
    pageMux.setMaxListeners(25);

    pump(pageMux, pageStream, pageMux, (err) =>
      logStreamDisconnectWarning("IronWallet Inpage Multiplex", err)
    );
    const pageChannel = pageMux.createStream(PROVIDER_ID);

    // extension streams
    const extensionPort = browser.runtime.connect({ name: "contentscript" });
    const extensionStream = new PortStream(extensionPort);

    // create and connect channel muxers
    // so we can handle the channels individually
    const extensionMux = new ObjectMultiplex();
    extensionMux.setMaxListeners(25);

    pump(extensionMux, extensionStream, extensionMux, (err: any) =>
      logStreamDisconnectWarning("IronWallet Inpage", err)
    );

    // forward communication across inpage-background for these channels only
    const extensionChannel = extensionMux.createStream(PROVIDER_ID);
    pump(pageChannel, extensionChannel, pageChannel, (err: any) =>
      console.debug(
        `IronWallet: Muxed traffic for channel ${PROVIDER_ID} failed.`,
        err
      )
    );
  }
}

function logStreamDisconnectWarning(remoteLabel: any, err: any) {
  let warningMsg = `MetamaskContentscript - lost connection to ${remoteLabel}`;
  if (err) warningMsg += "\n" + err.stack;
  console.warn(warningMsg);
}
