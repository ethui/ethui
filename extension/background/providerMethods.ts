import { type JsonRpcMiddleware } from "json-rpc-engine";
import { ethErrors } from "eth-rpc-errors";

// A handler is a JsonRpcMiddleware, but it can optionally be async,
// so the return type is more relaxed
type Handler = (
  ...[args]: Parameters<JsonRpcMiddleware<unknown, unknown>>
) => Promise<void> | void;

const requestAccounts: Handler = async (_req, res, _next, end) => {
  // TODO: this needs to come from the seed
  res.result = ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"];
  end();
};

const providerState: Handler = (_req, res, _next, end) => {
  // TODO: this needs to come from the current store state
  res.result = {
    isUnlocked: true,
    chainId: "0x1",
    networkVersion: "1",
    accounts: [],
  };
  end();
};

const handlers: Record<string, Handler> = {
  eth_requestAccounts: requestAccounts,
  metamask_getProviderState: providerState,
};

export const methodMiddleware: JsonRpcMiddleware<unknown, unknown> =
  async function (req, res, next, end) {
    // Reject unsupported methods.
    if (["eth_signTransaction"].includes(req.method)) {
      return end(ethErrors.rpc.methodNotSupported());
    }

    if (handlers[req.method]) {
      try {
        console.log("req.method", req.method);
        return await handlers[req.method](req, res, next, end);
      } catch (error) {
        console.error(error);
        return end(error);
      }
    }

    return next();
  };
