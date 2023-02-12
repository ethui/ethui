import browser from "webextension-polyfill";

export class Background {
  constructor() {
    console.log("[background] init");
    this.listenForMessages();
  }

  private listenForMessages() {
    browser.runtime.onMessage.addListener((message: any, sender: any) => {
      console.log("[background] received: ", message, sender);
    });
  }
}
