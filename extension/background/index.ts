import { providers } from "ethers";
import { listen } from "./messenger";

// init on load
(async () => init())();

const ALCHEMY_RPC =
  "https://eth-mainnet.g.alchemy.com/v2/rTwL6BTDDWkP3tZJUc_N6shfCSR5hsTs";

let provider: providers.JsonRpcProvider;

listen(async (req: any) => {
  switch (req.type) {
    case "add":
      return req.message[0] + req.message[1];
    case "eth":
      console.log("eth", req.message);
      const result = await provider.send(
        req.message.method,
        req.message.params
      );
      return result;
    // return await provider.getBlockNumber();
    default:
      throw `unknown message ${req.type}`;
  }
});

export async function init() {
  console.log("[background] init");
  provider = new providers.JsonRpcProvider(ALCHEMY_RPC);
}
