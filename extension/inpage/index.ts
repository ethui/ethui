import { IronProvider, attachGlobalProvider } from "@iron/ui/provider";
// import { requestToBackground } from "@iron/ui/messenger";

// init on load
(async () => init())();

let provider: IronProvider;

export async function init() {
  console.log("[inpage] init");
  setupProvider();
  //
  // console.log(
  //   "[inpage]",
  //   await requestToContent({ type: "add", message: [3, 5] })
  // );
  // console.log(
  //   "[inpage]",
  //   await requestToBackground({ type: "add", message: [3, 5] })
  // );
  // console.log(
  //   "[inpage]",
  //   await provider.request({ method: "eth_blockNumber" })
  // );
}

function setupProvider() {
  // setup a provider where requests are proxied to `requestToBackground`
  // provider = new IronProvider((req) =>
  //   requestToBackground({ type: "eth", message: req })
  // );

  attachGlobalProvider(provider);
}
