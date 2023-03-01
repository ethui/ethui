import { initProvider, setupProviderConnection } from "@iron/provider-worker";

const ALCHEMY_RPC =
  "https://eth-mainnet.g.alchemy.com/v2/rTwL6BTDDWkP3tZJUc_N6shfCSR5hsTs";

// init on load
(async () => init())();

export async function init() {
  console.log("[background] init");
  initProvider({ rpcUrl: ALCHEMY_RPC, chainId: "0x1" });
  handleConnections();
}

function handleConnections() {
  chrome.runtime.onConnect.addListener(async (remotePort: any, ...args) => {
    console.log("[background] onConnect", [remotePort, ...args]);
    setupProviderConnection(remotePort, remotePort.sender);
  });
}
