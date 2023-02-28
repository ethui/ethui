import PortStream from "extension-port-stream";
import ObjectMultiplex from "@metamask/object-multiplex";
import pump, { type Stream } from "pump";
import { createEngineStream } from "json-rpc-middleware-stream";
import { JsonRpcEngine, type JsonRpcMiddleware } from "json-rpc-engine";
import createFilterMiddleware from "eth-json-rpc-filters";
import createSubscriptionManager from "eth-json-rpc-filters/subscriptionManager";
import { nanoid } from "nanoid";
import { ethErrors } from "eth-rpc-errors";
import {
  providerFromMiddleware,
  providerFromEngine,
} from "@metamask/eth-json-rpc-provider";
import { providerAsMiddleware } from "@metamask/eth-json-rpc-middleware/src/providerAsMiddleware";
import createJsonRpcClient from "./jsonrpc";
import { methodMiddleware } from "./providerMethods";

//
// global state
//

let provider: any;
let connections: any = {};

//
// functions
//

export function initProvider({ rpcUrl, chainId }) {
  const { networkMiddleware, blockTracker } = createJsonRpcClient({
    rpcUrl,
    chainId,
  });

  console.log("here");

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
  subscriptionManager.events.on("notification", (message: any) =>
    engine.emit("notification", message)
  );
  engine.push(filterMiddleware);
  engine.push(subscriptionManager.middleware);
  engine.push(networkMiddleware);

  provider = providerFromEngine(engine);
}

export function setupProviderConnection(remotePort: any, sender: any) {
  const stream = new PortStream(remotePort);
  const mux = setupMultiplex(stream);
  const outStream = mux.createStream("metamask-provider");

  const origin = new URL(sender.url).origin;

  let tabId: any;
  if (sender.tab && sender.tab.id) {
    tabId = sender.tab.id;
  }

  const engine = setupProviderEngine();

  // setup connection
  const providerStream = createEngineStream({ engine });

  const connectionId = addConnection(origin, { engine });

  pump(
    outStream as unknown as Stream,
    providerStream,
    outStream as unknown as Stream,
    (err) => {
      // handle any middleware cleanup
      engine._middleware.forEach((mid) => {
        if (mid.destroy && typeof mid.destroy === "function") {
          mid.destroy();
        }
      });
      connectionId && removeConnection(origin, connectionId);
      if (err) {
        console.error(err);
      }
    }
  );
}

function setupMultiplex(connectionStream: any) {
  const mux = new ObjectMultiplex();
  const CONNECTION_READY = "CONNECTION_READY";
  mux.ignoreStream(CONNECTION_READY);
  mux.ignoreStream("ACK_KEEP_ALIVE_MESSAGE");
  mux.ignoreStream("WORKER_KEEP_ALIVE_MESSAGE");
  pump(connectionStream, mux as unknown as Stream, connectionStream, (err) => {
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
  provider.on("data", (error: any, message: any) => {
    console.log("data", error, message);
    if (error) {
      // This should never happen, this error parameter is never set
      throw error;
    }
    engine.emit("notification", message);
  });

  engine.push(methodMiddleware);

  // forward to metamask primary provider
  engine.push(providerAsMiddleware(provider));
  return engine;
}

function addConnection(origin: any, { engine }: any) {
  if (!connections[origin]) {
    connections[origin] = {};
  }

  const id = nanoid();
  connections[origin][id] = {
    engine,
  };

  return id;
}

function removeConnection(origin: any, id: any) {
  if (!connections[origin]) {
    connections[origin] = {};
  }

  delete connections[origin][id];

  if (Object.keys(connections[origin].length === 0)) {
    delete connections[origin];
  }
}

async function getProviderStateHandler(
  req: any,
  res: any,
  _next: any,
  end: any,
  { getProviderState: _getProviderState }: any
) {
  res.result = {
    ...(await _getProviderState(req.origin)),
  };
  return end();
}
