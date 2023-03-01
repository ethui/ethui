import { type JsonRpcMiddleware } from "json-rpc-engine";
import { ethErrors } from "eth-rpc-errors";

// A handler is a JsonRpcMiddleware, but it can optionally be async,
// so the return type is more relaxed
type Handler = (
  ...[args]: Parameters<JsonRpcMiddleware<unknown, unknown>>
) => Promise<void> | void;

const requestAccounts: Handler = async (_req, res, _next, end) => {
  // TODO: this needs to come from the seed
  res.result = ["0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5"];
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
  eth_accounts: requestAccounts,
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
