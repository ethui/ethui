import { type JsonRpcMiddleware } from "json-rpc-engine";
import { ethErrors } from "eth-rpc-errors";
import { useStore } from "@iron/state";

// A handler is a JsonRpcMiddleware, but it can optionally be async,
// so the return type is more relaxed
type Handler = (
  ...[args]: Parameters<JsonRpcMiddleware<unknown, unknown>>
) => Promise<void> | void;

const requestAccounts: Handler = async (_req, res, _next, end) => {
  const address = useStore.getState().wallet.address;
  res.result = [address];
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

const sendTransaction: Handler = (_req, res, _next, end) => {
  // TODO: send transaction
  end();
};

const handlers: Record<string, Handler> = {
  eth_accounts: requestAccounts,
  eth_requestAccounts: requestAccounts,
  eth_sendTransaction: sendTransaction,
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
        const ret = await handlers[req.method](req, res, next, end);
        console.log("[res]", res.result);
        return ret;
      } catch (error) {
        console.error(error);
        return end(error);
      }
    }

    return next();
  };
