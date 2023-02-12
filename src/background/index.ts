import browser from "webextension-polyfill";
import { ethers, providers } from "ethers";

const ALCHEMY_RPC =
  "https://eth-mainnet.g.alchemy.com/v2/rTwL6BTDDWkP3tZJUc_N6shfCSR5hsTs";

export class Background {
  private ethers: providers.JsonRpcProvider;

  constructor() {
    console.log("[background] init");
    this.listenForMessages();
    this.ethers = new providers.JsonRpcProvider(ALCHEMY_RPC);

    // TODO: for debug
    (globalThis as any).iron = this;
  }

  private listenForMessages() {
    browser.runtime.onMessage.addListener((message: any, sender: any) => {
      console.log("[background] received: ", message, sender);
    });
  }
}
