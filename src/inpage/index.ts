import { IronProvider, attachGlobalProvider } from "../provider";
import { requestToBackground, requestToContent } from "./messenger";

let provider: IronProvider;

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
    await provider.request({ method: "eth_blockNumber" })
  );
}

function setupProvider() {
  console.log("setting up provider2");
  // setup a provider where requests are proxied to `requestToBackground`
  provider = new IronProvider((req) =>
    requestToBackground({ type: "eth", message: req })
  );

  attachGlobalProvider(provider);
}
