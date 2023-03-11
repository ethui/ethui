import browser, { Runtime } from "webextension-polyfill";

import { initProvider, setupProviderConnection } from "@iron/provider-worker";
import { setupStatePing, setupStateServer } from "@iron/state";

const ALCHEMY_RPC =
  "https://eth-mainnet.g.alchemy.com/v2/rTwL6BTDDWkP3tZJUc_N6shfCSR5hsTs";

// init on load
(async () => init())();

export async function init() {
  console.log("[background] init");
  initProvider({ rpcUrl: ALCHEMY_RPC, chainId: "0x1" });
  handleConnections();
}

const extensionId = browser.runtime.id;

function handleConnections() {
  browser.runtime.onConnect.addListener(async (remotePort: Runtime.Port) => {
    if (remotePort?.sender?.origin == `chrome-extension://${extensionId}`) {
      if (remotePort.name == "state-client") {
        console.log("[background] onConnect: state-client", remotePort);
        await setupStateServer(remotePort);
      } else if (remotePort.name == "state-ping") {
        await setupStatePing(remotePort);
      }
    } else {
      console.log("[background] onConnect: external", remotePort);
      setupProviderConnection(remotePort, remotePort.sender);
    }
  });
}
