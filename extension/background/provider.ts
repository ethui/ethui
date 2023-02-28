import PortStream from "extension-port-stream";
import ObjectMultiplex from "@metamask/object-multiplex";
import pump, { type Stream } from "pump";
import { createEngineStream } from "json-rpc-middleware-stream";
import { JsonRpcEngine } from "json-rpc-engine";
import createFilterMiddleware from "eth-json-rpc-filters";
import createSubscriptionManager from "eth-json-rpc-filters/subscriptionManager";
import { selectHooks } from "@metamask/rpc-methods/dist/utils";
import { nanoid } from "nanoid";
import { ethErrors } from "eth-rpc-errors";
import {
  providerFromMiddleware,
  providerFromEngine,
} from "@metamask/eth-json-rpc-provider";
import { providerAsMiddleware } from "@metamask/eth-json-rpc-middleware/src/providerAsMiddleware";
import { permissionRpcMethods } from "@metamask/permission-controller";
import createJsonRpcClient from "./jsonrpc";

//
// global state
//

let provider: any;
let connections: any = {};
const getProviderState = {
  methodNames: ["metamask_getProviderState"],
  implementation: getProviderStateHandler,
  hookNames: {
    getProviderState: true,
  },
};
const localHandlers = [getProviderState];
const allHandlers = [...localHandlers, ...permissionRpcMethods.handlers];

const handlerMap = allHandlers.reduce((map, handler) => {
  for (const methodName of handler.methodNames) {
    map.set(methodName, handler);
  }
  return map;
}, new Map());

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

  engine.push(
    createMethodMiddleware({
      origin,

      getProviderState: (_origin: any) => ({
        isUnlocked: true,
        chainId: "0x1",
        networkVersion: "1",
        accounts: [],
      }),
    })
  );

  // forward to metamask primary provider
  engine.push(providerAsMiddleware(provider));
  return engine;
}

function createMethodMiddleware(hooks: any) {
  return async function methodMiddleware(
    req: any,
    res: any,
    next: any,
    end: any
  ) {
    // Reject unsupported methods.
    if (["eth_signTransaction"].includes(req.method)) {
      return end(ethErrors.rpc.methodNotSupported());
    }

    const handler = handlerMap.get(req.method);
    if (handler) {
      const { implementation, hookNames } = handler;
      try {
        // Implementations may or may not be async, so we must await them.
        return await implementation(
          req,
          res,
          next,
          end,
          selectHooks(hooks, hookNames)
        );
      } catch (error) {
        console.error(error);
        return end(error);
      }
    }

    return next();
  };
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
