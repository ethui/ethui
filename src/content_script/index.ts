import { WindowPostMessageStream } from "@metamask/post-message-stream";
import browser from "webextension-polyfill";

const CONTENT_SCRIPT = "ironwallet-contentscript";
const INPAGE = "ironwallet-inpage";

export class ContentScript {
  private stream: WindowPostMessageStream;

  constructor() {
    console.log("[contentScript] init");
    this.injectInPageScript();
    this.listenForMessages();
    this.stream = this.initializeStream();
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

  private initializeStream() {
    const stream = new WindowPostMessageStream({
      name: CONTENT_SCRIPT,
      target: INPAGE,
    });

    stream.write("hello1");
    stream.on("data", (data) =>
      console.log("[contentscript] received stream data: ", data)
    );

    return stream;
  }
}
