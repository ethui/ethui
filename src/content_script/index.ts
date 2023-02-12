import { WindowPostMessageStream } from "@metamask/post-message-stream";
import browser from "webextension-polyfill";

export class ContentScript {
  constructor() {
    console.log("[contentScript] init");
    this.injectInPageScript();
    this.listenForMessages();
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
}
