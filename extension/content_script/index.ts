import browser from "webextension-polyfill";
import { Request } from "../messenger/types";
import { listenWithBackgroundRelay } from "./messenger";

// init on load
(async () => init())();

export async function init() {
  console.log("[contentScript] init");
  injectInPageScript();

  // listen from messages from inpage
  // if `relay: true` message is relayed to background
  // otherwise it's handled with the given callback
  listenWithBackgroundRelay(async (event: Request) => {
    return "direct result from cs";
  });
}

/**
 * Injects the inpage script
 */
function injectInPageScript() {
  const url = browser.runtime.getURL("inpage/index.js");

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
