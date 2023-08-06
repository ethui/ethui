import type { JsonRpcMiddleware } from "json-rpc-engine";
import log from "loglevel";

/**
 * Create JSON-RPC middleware that logs warnings for deprecated RPC methods.
 *
 * @param log - The logging API to use.
 * @returns The JSON-RPC middleware.
 */
export function createRpcWarningMiddleware(): JsonRpcMiddleware<
  unknown,
  unknown
> {
  const sentWarnings = {
    ethDecryptDeprecation: false,
    ethGetEncryptionPublicKeyDeprecation: false,
  };

  return (req, _res, next) => {
    if (
      sentWarnings.ethDecryptDeprecation === false &&
      req.method === "eth_decrypt"
    ) {
      log.warn(
        `Iron: The RPC method 'eth_decrypt' is deprecated and may be removed in the future.\nFor more information, see: https://medium.com/metamask/metamask-api-method-deprecation-2b0564a84686`
      );
      sentWarnings.ethDecryptDeprecation = true;
    } else if (
      sentWarnings.ethGetEncryptionPublicKeyDeprecation === false &&
      req.method === "eth_getEncryptionPublicKey"
    ) {
      log.warn(
        `Iron: The RPC method 'eth_getEncryptionPublicKey' is deprecated and may be removed in the future.\nFor more information, see: https://medium.com/metamask/metamask-api-method-deprecation-2b0564a84686`
      );
      sentWarnings.ethGetEncryptionPublicKeyDeprecation = true;
    }
    next();
  };
}
