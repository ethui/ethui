import { mergeMiddleware } from "json-rpc-engine";
// this needs to be imported directly from fetch.ts to not cause CSP errors
import { createFetchMiddleware } from "@metamask/eth-json-rpc-middleware/src/fetch";
import { PollingBlockTracker } from "eth-block-tracker";
import { providerFromMiddleware } from "@metamask/eth-json-rpc-provider";

export default function createJsonRpcClient({ rpcUrl, chainId }) {
  const fetchMiddleware = createFetchMiddleware({ rpcUrl, fetch });

  const blockProvider = providerFromMiddleware(fetchMiddleware);
  const blockTracker = new PollingBlockTracker({
    provider: blockProvider,
  });

  const networkMiddleware = mergeMiddleware([fetchMiddleware]);
  console.log("networkMiddleware", networkMiddleware);
  return { networkMiddleware, blockTracker };
}
