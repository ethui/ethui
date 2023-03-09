import PortStream from "extension-port-stream";
import ObjectMultiplex from "@metamask/object-multiplex";
import pump, { type Stream } from "pump";
import { createEngineStream } from "json-rpc-middleware-stream";
import { JsonRpcEngine } from "json-rpc-engine";
import createFilterMiddleware from "eth-json-rpc-filters";
import createSubscriptionManager from "eth-json-rpc-filters/subscriptionManager";
import {
  providerFromMiddleware,
  providerFromEngine,
  type SafeEventEmitterProvider,
} from "@metamask/eth-json-rpc-provider";
import { providerAsMiddleware } from "@metamask/eth-json-rpc-middleware/src/providerAsMiddleware";
import * as Constants from "@iron/constants";
import { Runtime } from "webextension-polyfill";
import { Connections } from "./connections";
import createJsonRpcClient from "./jsonrpc";
import { methodMiddleware } from "./methods";
import { debugMiddleware } from "./debug";

//
// global state
//

let provider: SafeEventEmitterProvider;

//
// functions
//

export function initProvider({
  rpcUrl,
}: {
  rpcUrl: string;
  chainId: number | string;
}) {
  const { networkMiddleware, blockTracker } = createJsonRpcClient({
    rpcUrl,
  });

  const networkProvider = providerFromMiddleware(networkMiddleware);
  const filterMiddleware = createFilterMiddleware({
    provider: networkProvider,
    blockTracker,
  });
  const subscriptionManager = createSubscriptionManager({
    provider: networkProvider,
    blockTracker,
  });

  const engine = new JsonRpcEngine();
  subscriptionManager.events.on("notification", (message: unknown) =>
    engine.emit("notification", message)
  );
  engine.push(filterMiddleware);
  engine.push(subscriptionManager.middleware);
  engine.push(networkMiddleware);

  provider = providerFromEngine(engine);
}

export function setupProviderConnection(
  remotePort: Runtime.Port,
  sender: Runtime.MessageSender
) {
  const stream = new PortStream(remotePort);
  const mux = setupMultiplex(stream);
  const outStream = mux.createStream(Constants.provider.streamName);

  const origin = new URL(sender.url!).origin;

  // let tabId: any;
  // if (sender.tab && sender.tab.id) {
  //   tabId = sender.tab.id;
  // }

  const engine = setupProviderEngine();

  // setup connection
  const providerStream = createEngineStream({ engine });

  const connectionId = Connections.add(origin, { engine });

  pump(outStream, providerStream, outStream, (err) => {
    // handle any middleware cleanup
    engine._middleware.forEach((mid) => {
      if (mid.destroy && typeof mid.destroy === "function") {
        mid.destroy();
      }
    });
    connectionId && Connections.remove(origin, connectionId);
    if (err) {
      console.error(err);
    }
  });
}

export function setupInternalConnection(remotePort: Runtime.Port) {
  const stream = new PortStream(remotePort);

  stream.on("data", (message) => {
    if ((message.type = "broadcast")) {
      Connections.notifyAll(message.payload);
    }
  });
}

function setupMultiplex(connectionStream: Stream) {
  const mux = new ObjectMultiplex();
  const CONNECTION_READY = "CONNECTION_READY";
  mux.ignoreStream(CONNECTION_READY);
  mux.ignoreStream("ACK_KEEP_ALIVE_MESSAGE");
  mux.ignoreStream("WORKER_KEEP_ALIVE_MESSAGE");
  pump(connectionStream, mux, connectionStream, (err) => {
    if (err) {
      console.error(err);
    }
  });
  return mux;
}

function setupProviderEngine() {
  // const { provider } = this;
  // setup json rpc engine stack
  const engine = new JsonRpcEngine();
  // forward notifications from network provider
  provider.on("data", (error: Error, message: unknown) => {
    console.error("data", error, message);
    if (error) {
      // This should never happen, this error parameter is never set
      throw error;
    }
    engine.emit("notification", message);
  });

  engine.push(debugMiddleware);
  engine.push(methodMiddleware);

  // forward to metamask primary provider
  engine.push(providerAsMiddleware(provider));
  return engine;
}
