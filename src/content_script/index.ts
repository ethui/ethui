import { WindowPostMessageStream } from "@metamask/post-message-stream";
import browser from "webextension-polyfill";
import { CONTENT_SCRIPT_ID, INPAGE_ID } from "../constants";

export class ContentScript {
  private windowStream: WindowPostMessageStream;

  constructor() {
    console.log("[contentScript] init");
    this.injectInPageScript();
    this.listenForMessages();
    this.windowStream = this.initializeWindowStream();
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
    const stream = new WindowPostMessageStream({
      name: CONTENT_SCRIPT_ID,
      target: INPAGE_ID,
    });

    stream.write("hello from contentScript");
    stream.on("data", (data) =>
      console.log("[contentScript->windowStream] received: ", data)
    );

    return stream;
  }
}
