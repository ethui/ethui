const messages = {
  errors: {
    disconnected: () => "Iron: Disconnected from chain. Attempting to connect.",
    permanentlyDisconnected: () =>
      "Iron: Disconnected from Iron background. Page reload required.",
    unsupportedSync: (method: string) =>
      `Iron: The Iron Ethereum provider does not support synchronous methods like ${method} without a callback parameter.`,
    invalidDuplexStream: () => "Must provide a Node.js-style duplex stream.",
    invalidNetworkParams: () =>
      "Iron: Received invalid network parameters. Please report this bug.",
    invalidRequestArgs: () => `Expected a single, non-array, object argument.`,
    invalidRequestMethod: () => `'args.method' must be a non-empty string.`,
    invalidRequestParams: () =>
      `'args.params' must be an object or array if provided.`,
    invalidLoggerObject: () => `'args.logger' must be an object if provided.`,
    invalidLoggerMethod: (method: string) =>
      `'args.logger' must include required method '${method}'.`,
  },
  info: {
    connected: (chainId: string) =>
      `Iron: Connected to chain with ID "${chainId}".`,
  },
  warnings: {
    // deprecated methods
    enableDeprecation: `Iron: 'ethereum.enable()' is deprecated and may be removed in the future. Please use the 'eth_requestAccounts' RPC method instead.\nFor more information, see: https://eips.ethereum.org/EIPS/eip-1102`,
    sendDeprecation: `Iron: 'ethereum.send(...)' is deprecated and may be removed in the future. Please use 'ethereum.sendAsync(...)' or 'ethereum.request(...)' instead.\nFor more information, see: https://eips.ethereum.org/EIPS/eip-1193`,
    // deprecated events
    events: {
      close: `Iron: The event 'close' is deprecated and may be removed in the future. Please use 'disconnect' instead.\nFor more information, see: https://eips.ethereum.org/EIPS/eip-1193#disconnect`,
      data: `Iron: The event 'data' is deprecated and will be removed in the future. Use 'message' instead.\nFor more information, see: https://eips.ethereum.org/EIPS/eip-1193#message`,
      networkChanged: `Iron: The event 'networkChanged' is deprecated and may be removed in the future. Use 'chainChanged' instead.\nFor more information, see: https://eips.ethereum.org/EIPS/eip-1193#chainchanged`,
      notification: `Iron: The event 'notification' is deprecated and may be removed in the future. Use 'message' instead.\nFor more information, see: https://eips.ethereum.org/EIPS/eip-1193#message`,
    },
    rpc: {
      ethDecryptDeprecation: `Iron: The RPC method 'eth_decrypt' is deprecated and may be removed in the future.\nFor more information, see: https://medium.com/metamask/metamask-api-method-deprecation-2b0564a84686`,
      ethGetEncryptionPublicKeyDeprecation: `Iron: The RPC method 'eth_getEncryptionPublicKey' is deprecated and may be removed in the future.\nFor more information, see: https://medium.com/metamask/metamask-api-method-deprecation-2b0564a84686`,
    },
    // misc
    experimentalMethods: `Iron: 'ethereum._metamask' exposes non-standard, experimental methods. They may be removed or changed without warning.`,
  },
};
export default messages;
