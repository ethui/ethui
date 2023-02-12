import { WindowPostMessageStream } from "@metamask/post-message-stream";
import browser from "webextension-polyfill";

console.log("Content script works!");

function injectScript(file: string) {
  try {
    const container = document.head || document.documentElement;
    const scriptTag = document.createElement("script");
    scriptTag.setAttribute("async", "false");
    scriptTag.setAttribute("src", file);
    container.insertBefore(scriptTag, container.children[0]);
    container.removeChild(scriptTag);
  } catch (error) {
    console.error("Iron Wallet: Provider injection failed.", error);
  }
}

injectScript(browser.runtime.getURL("src/extension/inpage.js"));

const CONTENT_SCRIPT = "ironwallet-contentscript";
const INPAGE = "ironwallet-inpage";

const stream = new WindowPostMessageStream({
  name: CONTENT_SCRIPT,
  target: INPAGE,
});

stream.write("hello1");
stream.on("data", (data) => console.log(`contentscript received data ${data}`));
