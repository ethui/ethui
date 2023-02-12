import {
  createFetchMiddleware,
  providerFromEngine,
} from "eth-json-rpc-middleware";
import { JsonRpcEngine, mergeMiddleware } from "json-rpc-engine";
import browser from "webextension-polyfill";
import EthQuery from "ethjs-query";
import { ethers } from "ethers";

const ALCHEMY_RPC =
  "https://eth-mainnet.g.alchemy.com/v2/rTwL6BTDDWkP3tZJUc_N6shfCSR5hsTs";

export class Background {
  private provider;

  constructor() {
    console.log("[background] init");
    this.listenForMessages();
    this.provider = new ethers.providers.JsonRpcProvider(ALCHEMY_RPC);
    // this._oldprovider = this.initRpcClient();

    // TODO: for debug
    (globalThis as any).iron = this;
  }

  // getLatestBlock() {
  //   return new Promise((resolve, reject) => {
  //     const query = new EthQuery(this.provider);
  //     query.sendAsync(
  //       { method: "eth_blockNumber", params: ["latest", false] },
  //       (err: any, block: any) => {
  //         if (err) {
  //           return reject(err);
  //         }
  //         return resolve(block);
  //       }
  //     );
  //   });
  // }

  private listenForMessages() {
    browser.runtime.onMessage.addListener((message: any, sender: any) => {
      console.log("[background] received: ", message, sender);
    });

    browser.runtime.onConnect.addListener((port) => {
      console.log("onConnect", port);
      port.postMessage({ greeting: "hi there content script!" });
      port.onMessage.addListener((msg) => {
        console.log(
          "In background script, received message from content script"
        );
        console.log(msg);
      });
    });
  }

  // private initRpcClient() {
  //   const fetchMiddleware = createFetchMiddleware({ rpcUrl: ALCHEMY_RPC });
  //
  //   const networkMiddleware = mergeMiddleware([fetchMiddleware]);
  //
  //   const engine = new JsonRpcEngine();
  //   engine.push(networkMiddleware);
  //   const provider = providerFromEngine(engine);
  //
  //   return provider;
  // }
}
