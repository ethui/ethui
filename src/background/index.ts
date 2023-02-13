import browser, { Runtime } from "webextension-polyfill";
import PortStream from "extension-port-stream";
import { providers } from "ethers";
import ObjectMultiplex from "@metamask/object-multiplex";
import pump, { Stream } from "pump";

const ALCHEMY_RPC =
  "https://eth-mainnet.g.alchemy.com/v2/rTwL6BTDDWkP3tZJUc_N6shfCSR5hsTs";

let provider: providers.JsonRpcProvider;

export function init() {
  console.log("[background] init3");
  setupStreams();
  provider = new providers.JsonRpcProvider(ALCHEMY_RPC);
}

function setupStreams() {
  //
  // background <-> cs
  //

  // listen to new connections from content scripts
  browser.runtime.onConnect.addListener((...args) => {
    connectContentScript(...args);
  });
}

function connectContentScript(port: Runtime.Port) {
  console.log("port connected: ", port);
  const portStream = new PortStream(port);

  //
  // setup trusted communication
  //
  const mux = new ObjectMultiplex();

  const providerStream = mux.createStream("provider");

  portStream.on("data", (data: any) => {
    console.log(data, port.sender);
  });

  pump(
    providerStream as unknown as Stream,
    portStream,
    providerStream as unknown as Stream,
    (err) => {
      console.debug("[Iron] background conn closed with ", err);
    }
  );
}
