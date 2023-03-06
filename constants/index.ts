export const provider = {
  // The name of the stream consumed by {@link IronInpageProvider}.
  // TODO: need to change this "iron:provider" later, but currenly not sure if
  // this is used implicitly in some of metamask's dependencies
  streamName: "metamask-provider",
  contentscriptStreamName: "iron:provider:contentscript",
  inpageStreamName: "iron:provider:inpage",
};

export const windows = {
  expanded: "iron:expanded",
  popup: "iron:popup",
};

export const wallet = {
  mnemonic: "test test test test test test test test test test test junk",
  path: "m/44'/60'/0'/0",
  index: 0,
};

export const network = {
  rpc: "https://eth-mainnet.g.alchemy.com/v2/rTwL6BTDDWkP3tZJUc_N6shfCSR5hsTs",
};

export const networks = [
  {
    name: "mainnet",
    url: "https://eth-mainnet.g.alchemy.com/v2/rTwL6BTDDWkP3tZJUc_N6shfCSR5hsTs",
    currency: "ETH",
    chainId: 1,
    decimals: 18,
  },
  {
    name: "anvil",
    url: "http://locahlhost:8545",
    currency: "ETH",
    chainId: 31337,
    decimals: 18,
  },
];
