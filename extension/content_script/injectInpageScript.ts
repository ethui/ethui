import log from "loglevel";
import { runtime } from "webextension-polyfill";

/**
 * Injects the inpage script
 */
export function injectInPageScript() {
  const url = runtime.getURL("inpage.js");

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
