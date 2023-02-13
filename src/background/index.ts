import browser from "webextension-polyfill";
import { ethers, providers } from "ethers";

const ALCHEMY_RPC =
  "https://eth-mainnet.g.alchemy.com/v2/rTwL6BTDDWkP3tZJUc_N6shfCSR5hsTs";

let provider: providers.JsonRpcProvider;

export function init() {
  console.log("[background] init");
  listenForMessages();
  provider = new providers.JsonRpcProvider(ALCHEMY_RPC);
  setupDebug();
}

function listenForMessages() {
  browser.runtime.onMessage.addListener(
    (message: any, sender: any, sendResponse: any) => {
      console.log("[background] received: ", message, sender);
      sendResponse({ response: `response to ${message}` });
    }
  );
}

function setupDebug() {
  // TODO: for debug
  (globalThis as any).iron = { provider };
}
