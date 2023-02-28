import { type JsonRpcMiddleware } from "json-rpc-engine";
import { ethErrors } from "eth-rpc-errors";

const handlers = {
  eth_requestAccounts: requestAccounts,
  metamask_getProviderState: providerState,
};

function requestAccounts() {
  console.log("here");
}

function providerState() {
  return {
    isUnlocked: true,
    chainId: "0x1",
    networkVersion: "1",
    accounts: [],
  };
}

export const methodMiddleware: JsonRpcMiddleware<unknown, unknown> =
  async function (req, res, next, end) {
    // Reject unsupported methods.
    if (["eth_signTransaction"].includes(req.method)) {
      return end(ethErrors.rpc.methodNotSupported());
    }

    if (handlers[req.method]) {
      try {
        return await handlers[req.method](req, res, next, end);
      } catch (error) {
        console.error(error);
        return end(error);
      }
    }

    return next();
  };
