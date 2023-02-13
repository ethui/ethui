import { IronProvider, attachGlobalProvider } from "./provider";

import { Duplex } from "stream";
import { requestToBackground, requestToContent } from "./messenger";

let provider: IronProvider;
let csStream: Duplex;

export async function init() {
  console.log("[inpage] init");
  setupProvider();

  console.log(
    "[inpage]",
    await requestToContent({ type: "add", message: [3, 5] })
  );
  console.log(
    "[inpage]",
    await requestToBackground({ type: "add", message: [3, 5] })
  );
  console.log(
    "[inpage]",
    await requestToBackground({
      type: "eth",
      message: {
        method: "eth_getBalance",
        params: ["0x8D97689C9818892B700e27F316cc3E41e17fBeb9", "latest"],
      },
    })
  );
}

function setupProvider() {
  console.log("setting up provider");
  provider = new IronProvider();
  attachGlobalProvider(provider);
}
