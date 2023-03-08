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
  res.result = useStore.getState().getProviderState();
  end();
};

const chainId: Handler = (_req, res, _next, end) => {
  res.result = useStore.getState().getProviderState().chainId;
  end();
};

const switchChain: Handler = (req, res, next, end) => {
  const requestedChainId = Number(req.params![0].chainId);
  useStore.getState().switchToChain(Number(requestedChainId));

  res.result = null;
  console.log("[req]", req);
  end();
};

const sendTransaction: Handler = (req, res, _next, end) => {
  console.log("[req]", req);
  // TODO: send transaction
  end();
};

const handlers: Record<string, Handler> = {
  eth_accounts: requestAccounts,
  eth_requestAccounts: requestAccounts,
  eth_chainId: chainId,
  eth_sendTransaction: sendTransaction,
  metamask_getProviderState: providerState,
  wallet_switchEthereumChain: switchChain,
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
