import { ethErrors } from "eth-rpc-errors";
import { ethers } from "ethers";
import { type JsonRpcMiddleware } from "json-rpc-engine";

import { settings } from "@iron/state";

// A handler is a JsonRpcMiddleware, but it can optionally be async,
// so the return type is more relaxed
type Handler = (
  ...[args]: Parameters<JsonRpcMiddleware<unknown, unknown>>
) => Promise<void> | void;

const requestAccounts: Handler = async (_req, res, _next, end) => {
  res.result = [settings.wallet.address];
  end();
};

const providerState: Handler = (_req, res, _next, end) => {
  const currentNetwork = settings.network.networks[settings.network.current];

  res.result = {
    isUnlocked: true,
    chainId: `0x${currentNetwork.chainId.toString(16)}`,
    networkVersion: currentNetwork.name,
    accounts: [settings.wallet.address],
  };
  end();
};

const chainId: Handler = (_req, res, _next, end) => {
  const currentNetwork = settings.network.networks[settings.network.current];
  res.result = `0x${currentNetwork.chainId.toString(16)}`;
  end();
};

const switchChain: Handler = (req, _res, next, end) => {
  // TODO:
  // const requestedChainId = req.params![0].chainId;
  const id = parseInt(req.params[0].chainId.replace(/^0x/, ""), 16);
  const idx = settings.network.networks.findIndex(
    ({ chainId }) => chainId == id
  );
  settings.setCurrentNetwork(idx);

  // TODO: If the error code (error.code) is 4902, then the requested chain has
  // not been added by MetaMask, and you have to request to add it via
  // wallet_addEthereumChain.

  end();
};

const sendTransaction: Handler = async (req, res, _next, end) => {
  const { gas, gasPrice, from, to, data, value, chainId } = req.params[0];
  const currentNetwork = settings.network.networks[settings.network.current];
  const signer = settings.getSigner();
  const provider = settings.getProvider();
  const expectedAddress = await signer.getAddress();

  // not correct address
  if (from.toLowerCase() !== expectedAddress.toLowerCase()) {
    console.error(
      "sendTransaction: from address mismatch",
      from.toLowerCase(),
      expectedAddress.toLowerCase()
    );
    // TODO: should we do more here?
    end();
    return;
  }

  // TODO: maybe add nonce here?
  const tx = {
    gasLimit: gas,
    gasPrice: gasPrice || (await provider.getGasPrice()),
    from,
    to,
    data,
    value: value || 0,
    chainId: currentNetwork.chainId,
  };
  const txResponse = await signer.sendTransaction(tx);
  res.result = txResponse.hash;

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
        console.log("[req2]", req);
        const ret = await handlers[req.method](req, res, next, end);
        return ret;
      } catch (error) {
        console.error("method error", error);
        return end(error);
      }
    }

    return next();
  };
