import browser from "webextension-polyfill";

export function init() {
  console.log("[contentScript] init");
  injectInPageScript();
  listenForMessages();
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

function listenForMessages() {
  browser.runtime.onMessage.addListener((message: any, sender: any) => {
    console.log("content-script received: ", message, sender);
  });
}
