import browser from "webextension-polyfill";
/**
 * Injects the inpage script
 */
export function injectInPageScript() {
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
